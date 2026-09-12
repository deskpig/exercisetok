import { useEffect, useRef, useState } from 'react';
import type { MediaSnapshot, Rubric, StudySession } from '../domain/types';
import { isExtension, repository, subscribeStore } from '../storage/repository';
import { parseVideoList } from '../domain/transfer';
import { RubricChoice } from './RubricChoice';
import { BrowseWorkspace } from './BrowseWorkspace';
import { ExportPanel } from './ExportPanel';

async function openReview(id: string) {
  const path = 'review.html?session=' + encodeURIComponent(id);
  if (!isExtension()) {
    const opened = window.open(path, 'exercisetok-' + id, 'width=1180,height=850');
    if (!opened) throw new Error('Allow the review window, then click Open review workspace again.');
    return;
  }
  const url = chrome.runtime.getURL(path);
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find(tab => tab.url === url);
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else await chrome.windows.create({ url, type: 'popup', width: 1180, height: 850 });
}

export function WorkflowApp() {
  const [stage, setStage] = useState<'home' | 'rubric' | 'browse' | 'launched'>('home');
  const [mode, setMode] = useState<'browse' | 'review'>('browse');
  const [queue, setQueue] = useState<MediaSnapshot[]>([]);
  const [session, setSession] = useState<StudySession | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const guard = useRef(false);
  useEffect(() => {
    const refresh = () => { void repository.sessions().then(setSessions).catch(() => setError('Could not load local sessions.')); };
    refresh(); return subscribeStore(refresh);
  }, []);
  async function importList(selected?: File) {
    if (!selected) return;
    setError('');
    if (selected.size > 2_000_000) return setError('List must be smaller than 2 MB.');
    try {
      const { videos, duplicates } = parseVideoList(await selected.text());
      setQueue(videos); setMode('review'); setStage('rubric');
      setNotice(videos.length + ' videos ready for independent review.' + (duplicates ? ' Removed ' + duplicates + ' duplicate links.' : ''));
    } catch (cause) { setError((cause as Error).message); }
  }
  async function start(rubric: Rubric) {
    if (guard.current) return;
    guard.current = true; setBusy(true); setError('');
    try {
      const next: StudySession = { id: crypto.randomUUID(), mode, rubric: structuredClone(rubric), queue: mode === 'review' ? queue : [], index: 0, createdAt: new Date().toISOString() };
      await repository.saveSession(next);
      setSession(next);
      if (mode === 'browse') setStage('browse');
      else { setStage('launched'); await openReview(next.id); }
    } catch (cause) { setError((cause as Error).message || 'Could not start the session.'); }
    finally { guard.current = false; setBusy(false); }
  }
  async function resume(value: StudySession) {
    setSession(value); setError('');
    if (value.mode === 'browse') setStage('browse');
    else { setStage('launched'); try { await openReview(value.id); } catch (cause) { setError((cause as Error).message); } }
  }
  function home() { setStage('home'); setError(''); setNotice(''); }
  if (stage === 'browse' && session) return <BrowseWorkspace session={session} onHome={home} />;
  return <main className="collector workflow">
    <header><span className="eyebrow">Research workspace</span><h1>ExerciseTok</h1></header>
    {!isExtension() && <p className="preview-label">Development preview · local browser data</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {stage === 'home' && <>
      <section className="card welcome"><h2>What would you like to analyze?</h2>
        <div className="setup-options"><button onClick={() => { setMode('browse'); setQueue([]); setStage('rubric'); setNotice(''); }}>Browse new TikToks</button>
          <button className="secondary" onClick={() => file.current?.click()}>Upload another researcher’s TikTok list</button>
          <input ref={file} type="file" className="visually-hidden" accept=".json,.txt,application/json,text/plain" aria-label="TikTok list file" onChange={e => { void importList(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <p className="muted">Use an ExerciseTok blinded JSON list, a JSON array of full video URLs, or a .txt file with one URL per line. Up to 5,000 videos / 2 MB. Analysis exports with prior ratings are rejected.</p>
      </section>
      {sessions.length > 0 && <details className="card"><summary>Resume a session · {sessions.length}</summary>
        {sessions.map(value => <div className="session-row" key={value.id}>
          <div><strong>{value.mode === 'browse' ? 'Browsing' : 'List review'}</strong><p className="muted">{value.rubric.name} · {value.queue.length} videos · {new Date(value.createdAt).toLocaleString()}</p></div>
          <button className="secondary" onClick={() => { void resume(value); }}>Resume</button>
        </div>)}
      </details>}
      <ExportPanel />
    </>}
    {stage === 'rubric' && <>
      <button className="secondary" onClick={home}>Back</button>
      <p className="muted">Step 2 · {mode === 'browse' ? 'Browse and code' : 'Independent list review'}</p>
      {notice && <p role="status">{notice}</p>}
      <RubricChoice busy={busy} onChoose={rubric => { void start(rubric); }} />
      <p className="muted">A fresh session keeps your ratings separate. The chosen rubric is fixed for this session.</p>
    </>}
    {stage === 'launched' && session && <section className="card">
      <h2>Your review workspace is ready</h2>
      <p>Video and rubric appear side by side in a wider window. Your place and drafts are saved as you work.</p>
      <button onClick={() => { void openReview(session.id).catch(cause => setError(cause.message)); }}>Open review workspace</button>
      <button className="secondary" onClick={home}>Back to sessions</button>
    </section>}
  </main>;
}
