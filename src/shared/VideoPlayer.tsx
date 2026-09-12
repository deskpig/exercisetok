import { useEffect, useRef, useState } from 'react';
import type { MediaSnapshot } from '../domain/types';

export function VideoPlayer({ video, active }: { video: MediaSnapshot; active: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const message = (event: MessageEvent) => {
      if (event.origin !== 'https://www.tiktok.com' || event.source !== frame.current?.contentWindow || event.data?.['x-tiktok-player'] !== true) return;
      if (event.data.type === 'onPlayerReady') setReady(true);
      if (event.data.type === 'onPlayerError' || event.data.type === 'onError') setError(true);
      if (!active && (event.data.type === 'onPlayerReady' || (event.data.type === 'onStateChange' && event.data.value === 1))) frame.current?.contentWindow?.postMessage({ type: 'pause', 'x-tiktok-player': true }, 'https://www.tiktok.com');
    };
    window.addEventListener('message', message);
    if (!active) frame.current?.contentWindow?.postMessage({ type: 'pause', 'x-tiktok-player': true }, 'https://www.tiktok.com');
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => { clearTimeout(timer); window.removeEventListener('message', message); };
  }, [active, attempt]);
  // Official iframe player, never TikTok's remotely executed embed.js script.
  const src = 'https://www.tiktok.com/player/v1/' + video.externalId + '?autoplay=0&controls=1&description=1&rel=0';
  return <div className={active ? 'player-slot' : 'player-preload'} aria-hidden={!active} inert={!active}>
    <iframe ref={frame} key={attempt} title={active ? 'Current TikTok video' : 'Next TikTok preloaded'} src={src}
      tabIndex={active ? 0 : -1} allow="fullscreen; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    {active && <>
      {(error || (slow && !ready)) && <p className="muted">The player may be blocked or this video unavailable. Open the original link below, or mark it unavailable and continue.</p>}
      <div className="actions"><a className="button secondary" href={video.canonicalUrl} target="_blank" rel="noopener noreferrer">Open original TikTok</a>
        <button className="secondary" onClick={() => { setReady(false); setError(false); setSlow(false); setAttempt(attempt + 1); }}>Reload player</button></div>
    </>}
  </div>;
}
