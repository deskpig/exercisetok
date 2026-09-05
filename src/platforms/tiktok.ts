import type { MediaSnapshot } from '../domain/types';
import type { PlatformAdapter } from './adapter';

const VIDEO_PATH = /\/@([^/]+)\/video\/(\d+)/;

export const tiktokAdapter: PlatformAdapter = {
  platform: 'tiktok',
  matches: (url) => url.hostname.endsWith('tiktok.com'),
  readActiveMedia(document, url): MediaSnapshot | null {
    const direct = url.pathname.match(VIDEO_PATH);
    const visibleVideo = [...document.querySelectorAll<HTMLVideoElement>('video')]
      .find((video) => video.getBoundingClientRect().height > 200 && video.getBoundingClientRect().top < innerHeight * 0.75);
    const container = visibleVideo?.closest('[data-e2e], article, div[class*="DivItemContainer"]');
    const anchor = container?.querySelector<HTMLAnchorElement>('a[href*="/video/"]');
    const resolved = direct ? url : anchor ? new URL(anchor.href) : null;
    const match = resolved?.pathname.match(VIDEO_PATH);
    if (!resolved || !match) return null;
    return {
      platform: 'tiktok',
      canonicalUrl: `${resolved.origin}/@${match[1]}/video/${match[2]}`,
      externalId: match[2],
      author: match[1],
      caption: container?.querySelector<HTMLElement>('[data-e2e="browse-video-desc"], [data-e2e="video-desc"]')?.innerText,
      observedAt: new Date().toISOString()
    };
  },
  observe(onChange) {
    let timer = 0;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(onChange, 200);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    addEventListener('popstate', onChange);
    return () => { observer.disconnect(); removeEventListener('popstate', onChange); };
  }
};
