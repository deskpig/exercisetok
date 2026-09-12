import { useEffect, useRef, useState } from 'react';
import type { StudySession } from '../domain/types';
import { repository, subscribeStore } from '../storage/repository';
import { EvaluationEditor, type EditorHandle } from './EvaluationEditor';
import { VideoPlayer } from './VideoPlayer';
import { ExportPanel } from './ExportPanel';

export function ReviewWorkspace({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [error, setError] = useState('');
  const [moving, setMoving] = useState(false);
  const [completed, setCompleted] = useState(0);
  const editor = useRef<EditorHandle>(null);
  const guard = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const failed = () => { if (!cancelled) setError('Could not load local review data. Reopen this session to retry.'); };
    void repository.session(sessionId).then(value => {
      if (cancelled) return;
      if (!value?.queue.length) setError('This review session is missing or empty. Start from the extension panel.');
      else setSession(value);
    }).catch(failed);
    const refresh = () => { void repository.list(sessionId).then(rows => {
      if (!cancelled) setCompleted(rows.filter(row => row.status === 'complete').length);
    }).catch(failed); };
    refresh();
    const unsubscribe = subscribeStore(refresh);
    return () => { cancelled = true; unsubscribe(); };
  }, [sessionId]);
  async function go(index: number) {
    if (!session || guard.current || index < 0 || index >= session.queue.length) return;
    guard.current = true; setMoving(true); setError('');
    try {
      await editor.current?.flush();
      setSession(await repository.setIndex(session.id, index));
    } catch (cause) { setError((cause as Error).message || 'Could not save before changing videos.'); }
    finally { guard.current = false; setMoving(false); }
  }
  if (!session) return <main><p role="alert">{error || 'Loading review session…'}</p></main>;
  const current = session.queue[session.index];
  const last = session.index === session.queue.length - 1;
  return <main className="review-workspace">
    <header className="workspace-header"><div><span className="eyebrow">ExerciseTok · independent review</span><h1>{session.rubric.name}</h1><p className="muted">{completed} of {session.queue.length} complete · Your ratings only</p></div><ExportPanel sessionId={session.id} beforeExport={async () => { if (editor.current) await editor.current.flush(); }} /></header>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="review-grid">
      <section className="viewer" aria-label="Sequential video viewer">
        <nav className="queue-nav" aria-label="Video navigation">
          <button className="secondary" disabled={moving || session.index === 0} onClick={() => { void go(session.index - 1); }}>Previous</button>
          <strong aria-live="polite">Video {session.index + 1} of {session.queue.length}</strong>
          <button className="secondary" disabled={moving || last} onClick={() => { void go(session.index + 1); }}>Next</button>
        </nav>
        {session.queue.slice(session.index, session.index + 2).map(video => <VideoPlayer key={video.externalId} video={video} active={video.externalId === current.externalId} />)}
        <p className="muted">Only this video is visible. The next player loads silently in the background. Previous and Next preserve drafts.</p>
        {last && <p className="end-note">Last video. Complete this rating, then use Export & share.</p>}
      </section>
      <div className="collector"><EvaluationEditor key={current.externalId} ref={editor} session={session} media={current} onComplete={last ? undefined : () => go(session.index + 1)} /></div>
    </div>
  </main>;
}
