import { useEffect, useRef, useState } from 'react';
import type { ExtensionMessage, MediaSnapshot, StudySession } from '../domain/types';
import { isExtension, repository } from '../storage/repository';
import { parseTikTokUrl } from '../domain/transfer';
import { EvaluationEditor, type EditorHandle } from './EvaluationEditor';
import { ExportPanel } from './ExportPanel';
import { ExpandIcon } from './ViewingPrompt';

export function BrowseWorkspace({ session, onHome }: { session: StudySession; onHome: () => void }) {
  const [media, setMedia] = useState<MediaSnapshot | null>(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
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
  async function refresh() {
    if (!isExtension()) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab.current = tab?.id;
      if (tab?.id === undefined) return select(null);
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVE_MEDIA_REQUEST' } satisfies ExtensionMessage) as ExtensionMessage;
        if (activeTab.current === tab.id && response.type === 'ACTIVE_MEDIA_RESPONSE') await select(response.media);
      } catch { if (activeTab.current === tab.id) await select(null); }
    } catch { if (alive.current) setError('Could not read the active tab. Reopen the panel to retry.'); }
  }
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
  return <main className="collector browse-workspace">
    <header className="row"><h1>ExerciseTok</h1><button className="secondary" onClick={() => { void home(); }}>Sessions</button></header>
    <ExportPanel sessionId={session.id} beforeExport={async () => { if (editor.current) await editor.current.flush(); }} />
    {!media && <section className="card">
      <h2>Rubric ready. Start viewing.</h2>
      <p>Open TikTok and choose a video. Click its <span className="expand-hint"><ExpandIcon /> Expand</span> control to open the full video view.</p>
      <a className="button" href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer">Open TikTok</a>
      <p className="muted">Keep this panel open as you browse. New videos start drafts; returning to a video restores your answers.</p>
    </section>}
    <section className="card">
      {media && <><strong>@{media.author}</strong><a className="muted video-link" href={media.canonicalUrl} target="_blank" rel="noopener noreferrer">{media.canonicalUrl}</a></>}
      <button className="secondary" onClick={() => { void refresh(); }}>Refresh detection</button>
      <details><summary>Add a video by link</summary><div className="field"><label htmlFor="manual-url">Full TikTok video URL</label><input id="manual-url" value={manual} onChange={e => setManual(e.target.value)} placeholder="https://www.tiktok.com/@creator/video/123…" /></div><button onClick={() => { try { void select(parseTikTokUrl(manual)); } catch (cause) { setError((cause as Error).message); } }}>Code this link</button></details>
    </section>
    {error && <p className="error" role="alert">{error}</p>}
    {media && <EvaluationEditor key={media.externalId} ref={editor} session={session} media={media} />}
  </main>;
}
