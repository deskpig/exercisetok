import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RubricForm } from '../shared/RubricForm';
import { repository } from '../storage/repository';
import type { Evaluation, ExtensionMessage, MediaSnapshot, Rubric } from '../domain/types';
import '../shared/styles.css';

function App() {
  const [media, setMedia] = useState<MediaSnapshot | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [rater, setRater] = useState('researcher-1');
  const [ratings, setRatings] = useState<Evaluation['ratings']>({});
  const [notes, setNotes] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return setMedia(null);
    try { const response = await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVE_MEDIA_REQUEST' } satisfies ExtensionMessage) as ExtensionMessage; if (response.type === 'ACTIVE_MEDIA_RESPONSE') setMedia(response.media); }
    catch { setMedia(null); }
  };
  useEffect(() => { Promise.all([repository.rubric(), repository.rater()]).then(([a, b]) => { setRubric(a); setRater(b); }); refresh(); const listener = (message: ExtensionMessage) => { if (message.type === 'MEDIA_CHANGED') setMedia(message.media); }; chrome.runtime.onMessage.addListener(listener); return () => chrome.runtime.onMessage.removeListener(listener); }, []);
  useEffect(() => { setRatings({}); setNotes(''); setNotice(''); }, [media?.canonicalUrl]);

  async function save(status: Evaluation['status']) {
    if (!media || !rubric) return;
    const missing = rubric.fields.filter((field) => field.required && (ratings[field.id] === undefined || ratings[field.id] === '')).map((field) => field.label);
    if (status === 'complete' && missing.length) return setNotice(`Complete required fields: ${missing.join(', ')}`);
    const now = new Date().toISOString();
    await repository.setRater(rater);
    await repository.save({ id: crypto.randomUUID(), media, rubricId: rubric.id, rubricVersion: rubric.version, raterId: rater, ratings, notes, status, createdAt: now, updatedAt: now });
    setNotice(status === 'complete' ? 'Evaluation saved.' : 'Draft saved.');
  }
  return <main><h1>ExerciseTok collector</h1><div className="card"><strong>{media ? `@${media.author ?? 'unknown'}` : 'No TikTok detected'}</strong><div className="muted">{media?.canonicalUrl ?? 'Open a TikTok video or scroll the For You feed.'}</div></div>{media && rubric && <div className="card"><div className="field"><label>Rater ID</label><input value={rater} onChange={(e) => setRater(e.target.value)} /></div><RubricForm rubric={rubric} values={ratings} onChange={(id, value) => setRatings((old) => ({ ...old, [id]: value }))} /><div className="field"><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div><div className="actions"><button onClick={() => save('complete')}>Save complete</button><button className="secondary" onClick={() => save('draft')}>Save draft</button></div>{notice && <p>{notice}</p>}</div>}<button className="secondary" onClick={() => chrome.runtime.openOptionsPage()}>Open review queue</button></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
