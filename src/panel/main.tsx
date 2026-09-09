import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RubricForm } from '../shared/RubricForm';
import { RubricUpload } from '../shared/RubricUpload';
import { repository } from '../storage/repository';
import { answerErrors, classify } from '../domain/classification';
import type { Congruence, Evaluation, ExtensionMessage, MediaSnapshot, Rubric } from '../domain/types';
import '../shared/styles.css';

function App() {
  const [media, setMedia] = useState<MediaSnapshot | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [rater, setRater] = useState('researcher-1');
  const [ratings, setRatings] = useState<Evaluation['ratings']>({});
  const [notes, setNotes] = useState('');
  const [notice, setNotice] = useState('');
  const [override, setOverride] = useState<Congruence | ''>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);
  const record = useRef<{ id: string; createdAt: string } | null>(null);
  const savingRef = useRef(false);
  const activeTab = useRef<number | undefined>(undefined);

  async function refresh() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab.current = tab?.id;
    if (!tab?.id) return setMedia(null);
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVE_MEDIA_REQUEST' } satisfies ExtensionMessage) as ExtensionMessage;
      if (activeTab.current === tab.id && response.type === 'ACTIVE_MEDIA_RESPONSE') setMedia(response.media);
    } catch { if (activeTab.current === tab.id) setMedia(null); }
  }
  useEffect(() => {
    Promise.all([repository.rubric(), repository.rater()]).then(([a,b]) => { setRubric(a); setRater(b); }).catch(() => setNotice('Could not load local settings.'));
    void refresh();
    const listener = (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => {
      if (message.type === 'MEDIA_CHANGED' && sender.tab?.id === activeTab.current) setMedia(message.media);
    };
    const activated = () => { void refresh(); };
    const changed = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.rubric) void repository.rubric().then(setRubric);
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.tabs.onActivated.addListener(activated);
    chrome.storage.onChanged.addListener(changed);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      chrome.tabs.onActivated.removeListener(activated);
      chrome.storage.onChanged.removeListener(changed);
    };
  }, []);
  useEffect(() => {
    setRatings({}); setNotes(''); setNotice(''); setOverride(''); setOverrideReason(''); record.current = null;
  }, [media?.canonicalUrl, rubric?.id, rubric?.version]);
  function change(id: string, value: Evaluation['ratings'][string]) {
    setRatings(old => ({ ...old, [id]: value }));
    setOverride(''); setOverrideReason(''); setNotice('');
  }
  const automatic = rubric ? classify(rubric, ratings) : null;
  const final = automatic?.eligibility === 'included' ? override || automatic.suggested : null;
  async function save(status: Evaluation['status']) {
    if (!media || !rubric || savingRef.current) return;
    const errors = status === 'complete' ? answerErrors(rubric, ratings) : [];
    if (!rater.trim()) errors.push('Enter a rater ID.');
    if (override && !overrideReason.trim()) errors.push('Give a reason for the reviewer override.');
    if (status === 'complete' && rubric.classification && automatic?.eligibility === 'included' && !final) errors.push('Complete global classification.');
    if (errors.length) return setNotice(errors.join(' '));
    savingRef.current = true; setSaving(true);
    const now = new Date().toISOString();
    const identity = record.current ?? { id: crypto.randomUUID(), createdAt: now };
    record.current = identity;
    try {
      await repository.setRater(rater.trim());
      await repository.save({
        ...identity, media, rubricId: rubric.id, rubricVersion: rubric.version,
        rubricSnapshot: rubric, raterId: rater.trim(), ratings, notes, status, updatedAt: now,
        classification: rubric.classification && automatic ? { ...automatic, final, override: automatic.eligibility === 'included' ? override || null : null, overrideReason: automatic.eligibility === 'included' ? overrideReason.trim() : '' } : undefined
      });
      if (record.current === identity) setNotice('Evaluation saved (' + status + ').');
    } catch { setNotice('Save failed. Your form is still here; please retry.'); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return <main>
    <h1>ExerciseTok collector</h1>
    {rubric && <><RubricUpload rubric={rubric} onApplied={setRubric} />
      <details className="card" open><summary>Encoding criteria</summary><p>{rubric.guidance || 'See guidance beside each question.'}</p></details>
    </>}
    <div className="card"><strong>{media ? '@' + (media.author ?? 'unknown') : 'No TikTok detected'}</strong>
      <div className="muted">{media?.canonicalUrl ?? 'Open a TikTok video, then refresh detection.'}</div>
      <button className="secondary" onClick={refresh}>Refresh detection</button>
    </div>
    {media && rubric && <div className="card">
      <p className="muted">Save before changing videos; unsaved answers are cleared when a different video is detected.</p>
      <div className="field"><label htmlFor="rater">Rater ID</label><input id="rater" value={rater} onChange={e => { setRater(e.target.value); record.current = null; }} /></div>
      <RubricForm rubric={rubric} values={ratings} onChange={change} />
      {rubric.classification && automatic && <section className="card" aria-label="Global encoding">
        <h2>Global encoding</h2>
        <p>Inclusion: {automatic.eligibility}</p>
        <p aria-live="polite">Automatic: <strong>{automatic.suggested ?? 'Not classified'}</strong></p>
        <p className="muted">{automatic.reason}</p>
        <div className="field"><label htmlFor="override">Reviewer override</label>
          <select id="override" disabled={automatic.eligibility !== 'included'} value={override} onChange={e => setOverride(e.target.value as Congruence | '')}>
            <option value="">Use automatic classification</option>
            <option value="incongruent">Incongruent</option><option value="congruent">Congruent</option><option value="partially congruent">Partially congruent</option>
          </select>
        </div>
        {override && <div className="field"><label htmlFor="override-reason">Override reason (required)</label><textarea id="override-reason" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} /></div>}
        <p>Final encoding: <strong>{final ?? 'Not classified'}</strong></p>
        <p className="muted">Changing an answer resets the override so you can reconsider it.</p>
      </section>}
      <div className="field"><label htmlFor="notes">Notes / supporting quotations</label><textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <div className="actions"><button disabled={saving} onClick={() => save('complete')}>Save complete</button><button disabled={saving} className="secondary" onClick={() => save('draft')}>Save draft</button></div>
    </div>}
    <p role="status">{notice}</p>
    <button className="secondary" onClick={() => chrome.runtime.openOptionsPage()}>Open review queue</button>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
