import { useEffect, useRef, useState } from 'react';
import type { ExtensionMessage, MediaSnapshot, StudySession } from '../domain/types';
import { isExtension, repository, subscribeStore } from '../storage/repository';
import { parseTikTokUrl } from '../domain/transfer';
import { EvaluationEditor, type EditorHandle } from './EvaluationEditor';
import { ExportPanel } from './ExportPanel';
import { ExpandIcon } from './ViewingPrompt';

export function BrowseWorkspace({ session, onHome }: { session: StudySession; onHome: () => void }) {
  const [media, setMedia] = useState<MediaSnapshot | null>(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [notice, setNotice] = useState('');
  const [cleared, setCleared] = useState(false);
  const editor = useRef<EditorHandle>(null);
  const activeTab = useRef<number | undefined>(undefined);
  const request = useRef(0);
  const alive = useRef(true);
  async function select(candidate: MediaSnapshot | null) {
    const token = ++request.current;
    try {
      if (editor.current) await editor.current.flush();
      if (candidate) {
        const clean = { ...candidate, ...parseTikTokUrl(candidate.canonicalUrl, candidate.observedAt) };
        await repository.addMedia(session.id, clean);
        if (alive.current && token === request.current) setMedia(clean);
      } else if (alive.current && token === request.current) setMedia(null);
      if (alive.current && token === request.current) setError('');
    } catch (cause) { if (alive.current) setError((cause as Error).message); }
  }
  async function refresh(explicit = false) {
    if (!isExtension()) return;
    if (explicit) { setDetecting(true); setNotice('Detecting the TikTok on screen…'); }
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab.current = tab?.id;
      if (tab?.id === undefined) return select(null);
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: explicit ? 'DETECT_ACTIVE_MEDIA_REQUEST' : 'ACTIVE_MEDIA_REQUEST' } satisfies ExtensionMessage) as ExtensionMessage;
        if (activeTab.current === tab.id && response.type === 'ACTIVE_MEDIA_RESPONSE') {
          await select(response.media);
          if (explicit) setNotice(response.notice || (response.media ? 'TikTok detected.' : 'Open a TikTok post and try again.'));
        }
      } catch { if (activeTab.current === tab.id) { await select(null); if (explicit) setNotice('Open TikTok and refresh that tab, then try Detect TikTok again.'); } }
    } catch { if (alive.current) setError('Could not read the active tab. Reopen the panel to retry.'); }
    finally { if (alive.current) setDetecting(false); }
  }
  useEffect(() => {
    let cancelled = false;
    const check = () => { void repository.session(session.id).then(value => { if (!cancelled && !value) setCleared(true); }).catch(() => { if (!cancelled) setError('Could not check the saved session.'); }); };
    const unsubscribe = subscribeStore(check);
    check(); return () => { cancelled = true; unsubscribe(); };
  }, [session.id]);
  useEffect(() => {
    alive.current = true;
    if (!isExtension()) return () => { alive.current = false; };
    void refresh();
    const changed = (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => {
      if (message.type === 'MEDIA_CHANGED' && sender.tab?.id === activeTab.current) void select(message.media);
    };
    const activated = () => { void refresh(); };
    const updated = (id: number, info: { status?: string }) => { if (id === activeTab.current && info.status === 'complete') void refresh(); };
    chrome.runtime.onMessage.addListener(changed); chrome.tabs.onActivated.addListener(activated); chrome.tabs.onUpdated.addListener(updated);
    return () => {
      alive.current = false; ++request.current;
      chrome.runtime.onMessage.removeListener(changed); chrome.tabs.onActivated.removeListener(activated); chrome.tabs.onUpdated.removeListener(updated);
    };
  }, [session.id]);
  async function home() {
    try { if (editor.current) await editor.current.flush(); onHome(); }
    catch { setError('Save failed. Retry Save draft before leaving.'); }
  }
  if (cleared) return <main className="collector"><p role="status">This session and its saved list were cleared.</p><button onClick={onHome}>Back to sessions</button></main>;
  return <main className="collector browse-workspace">
    <header className="row"><h1>ExerciseTok</h1><button className="secondary" onClick={() => { void home(); }}>Sessions</button></header>
    <ExportPanel sessionId={session.id} beforeExport={async () => { if (editor.current) await editor.current.flush(); }} />
    {!media && <section className="card">
      <h2>Rubric ready. Start viewing.</h2>
      <p>Open TikTok and choose a video or slideshow. On For You, click <strong>Detect TikTok</strong> below. You can also use the post’s <span className="expand-hint"><ExpandIcon /> Expand</span> control.</p>
      <a className="button" href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer">Open TikTok</a>
      <p className="muted">Keep this panel open as you browse. New videos start drafts; returning to a video restores your answers.</p>
    </section>}
    <section className="card">
      {media && <><strong>@{media.author}{media.mediaType === 'slideshow' ? ' · Slideshow' : ''}</strong><a className="muted video-link" href={media.canonicalUrl} target="_blank" rel="noopener noreferrer">{media.canonicalUrl}</a></>}
      <button className="secondary" disabled={detecting} onClick={() => { void refresh(true); }}>{detecting ? 'Detecting…' : 'Detect TikTok'}</button>
      <p className="muted">Finds the post on screen; may open its comments on For You.</p>
      {notice && <p role="status" className="muted">{notice}</p>}
      <details><summary>Add a TikTok by link</summary><div className="field"><label htmlFor="manual-url">Full TikTok video or photo URL</label><input id="manual-url" value={manual} onChange={e => setManual(e.target.value)} placeholder="https://www.tiktok.com/@creator/photo/123…" /></div><button onClick={() => { try { void select(parseTikTokUrl(manual)); } catch (cause) { setError((cause as Error).message); } }}>Code this link</button></details>
    </section>
    {error && <p className="error" role="alert">{error}</p>}
    {media && <EvaluationEditor key={media.externalId} ref={editor} session={session} media={media} />}
  </main>;
}
