import type { MediaSnapshot } from '../domain/types';
import { parseTikTokUrl } from '../domain/transfer';
import type { PlatformAdapter } from './adapter';

// Generated DivItemContainer classes can mark an inner player, not the post.
const POST = 'article, [data-e2e="recommend-list-item-container"], [data-e2e="recommend-list-item"], [data-e2e="feed-item"], [data-e2e="video-item"]';
const LINKS = 'a[href*="/video/"], a[href*="/photo/"]';
const COMMENTS = '[data-e2e="comment-icon"], [data-e2e="comment-button"], [data-e2e="comment-count"], [data-e2e="browse-comment"], button[aria-label*="comment" i], [role="button"][aria-label*="comment" i], button[title*="comment" i]';
const EXCLUDED = 'nav, aside, [hidden], [data-e2e="comment-list"], [data-e2e="comment-item"]';
const RELATED_LINKS = '[data-e2e="video-desc"], [data-e2e="browse-video-desc"], [data-e2e="comment-list"], [data-e2e="comment-item"]';

function parse(value: string, base: URL) {
  try { return parseTikTokUrl(new URL(value, base).href); } catch { return null; }
}
export const isForYouPage = (url: URL) => /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:foryou\/?)?$/i.test(url.pathname);

function containerFor(element: HTMLElement): HTMLElement | null {
  const known = element.closest<HTMLElement>(POST);
  if (known) return known;
  // Climb beyond the inner video wrapper, but never treat a whole multi-post feed as one post.
  let linked: HTMLElement | null = null;
  for (let node: HTMLElement | null = element; node && node.tagName !== 'BODY' && node.tagName !== 'MAIN'; node = node.parentElement) {
    if (node.querySelectorAll(POST).length > 1 || node.querySelectorAll('video').length > 1) break;
    if (node.querySelector(COMMENTS)) return node;
    if (!linked && (node.matches(LINKS) || node.querySelector(LINKS))) linked = node;
  }
  return linked;
}

function visibilityScore(element: HTMLElement, document: Document) {
  if (element.closest(EXCLUDED)) return -1;
  const view = document.defaultView;
  if (!view) return -1;
  const box = element.getBoundingClientRect();
  const width = Math.max(0, Math.min(box.right, view.innerWidth) - Math.max(box.left, 0));
  const height = Math.max(0, Math.min(box.bottom, view.innerHeight) - Math.max(box.top, 0));
  if (box.width < 120 || box.height < 160 || width < 80 || height < 120) return -1;
  const fraction = width * height / (box.width * box.height);
  if (fraction < 0.25) return -1;
  // Check styles only for on-screen candidates, not every feed thumbnail.
  // aria-hidden is an accessibility hint, not proof that a player is invisible.
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return -1;
  }
  const center = Math.max(0, box.top) + height / 2;
  return fraction * 100 + width * height / (view.innerWidth * view.innerHeight) * 30 - Math.abs(center - view.innerHeight / 2) / view.innerHeight * 20;
}

export function visibleTikTokPost(document: Document): { container: HTMLElement; media: HTMLElement } | null {
  const candidates = new Map<HTMLElement, { container: HTMLElement; media: HTMLElement; score: number }>();
  for (const element of document.querySelectorAll<HTMLElement>('video, img')) {
    const score = visibilityScore(element, document);
    if (score < 0) continue;
    const container = containerFor(element);
    if (container && score > (candidates.get(container)?.score ?? -1)) candidates.set(container, { container, media: element, score });
  }
  // Photo posts can use background images or a canvas instead of a video/img element.
  for (const container of document.querySelectorAll<HTMLElement>(POST)) {
    if (candidates.has(container)) continue;
    const score = visibilityScore(container, document);
    if (score >= 0 && (container.querySelector(COMMENTS) || container.querySelector(LINKS))) candidates.set(container, { container, media: container, score });
  }
  return [...candidates.values()].sort((a, b) => b.score - a.score)[0] ?? null;
}

function postLink(post: { container: HTMLElement; media: HTMLElement }, url: URL) {
  const mediaLink = post.media.closest<HTMLAnchorElement>('a[href]');
  if (mediaLink && post.container.contains(mediaLink)) {
    const result = parse(mediaLink.href, url);
    if (result) return result;
  }
  if (post.container.matches(LINKS)) {
    const result = parse((post.container as HTMLAnchorElement).href, url);
    if (result) return result;
  }
  const links = [...post.container.querySelectorAll<HTMLAnchorElement>(LINKS)]
    .filter(anchor => !anchor.closest(RELATED_LINKS))
    .map(anchor => parse(anchor.href, url)).filter((item): item is MediaSnapshot => !!item);
  // Ambiguous containers are not safe to code; a direct permalink or comment action can resolve them.
  return new Set(links.map(link => link.externalId)).size === 1 ? links[0] : null;
}

export const tiktokAdapter: PlatformAdapter = {
  platform: 'tiktok',
  matches: url => url.protocol === 'https:' && ['www.tiktok.com', 'tiktok.com', 'm.tiktok.com'].includes(url.hostname),
  readActiveMedia(document, url): MediaSnapshot | null {
    if (!this.matches(url)) return null;
    const direct = parse(url.href, url);
    const post = visibleTikTokPost(document);
    const result = direct ?? (post ? postLink(post, url) : null);
    if (!result) return null;
    const scope = post?.container ?? document;
    return { ...result, caption: scope.querySelector<HTMLElement>('[data-e2e="browse-video-desc"], [data-e2e="video-desc"]')?.textContent?.trim() };
  },
  observe(onChange) {
    let timer: number | undefined;
    const schedule = () => {
      if (timer !== undefined) return;
      timer = window.setTimeout(() => { timer = undefined; onChange(); }, 150);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'src', 'class', 'style', 'hidden', 'aria-hidden'] });
    document.addEventListener('scroll', schedule, true);
    document.addEventListener('playing', schedule, true);
    document.addEventListener('loadedmetadata', schedule, true);
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('popstate', schedule);
    // Covers SPA navigation and recycled players with no DOM/scroll event.
    const scanTimer = window.setInterval(schedule, 1000);
    schedule();
    return () => {
      observer.disconnect(); clearTimeout(timer); clearInterval(scanTimer);
      document.removeEventListener('scroll', schedule, true);
      document.removeEventListener('playing', schedule, true);
      document.removeEventListener('loadedmetadata', schedule, true);
      document.removeEventListener('visibilitychange', schedule);
      window.removeEventListener('resize', schedule); window.removeEventListener('popstate', schedule);
    };
  }
};

// A comment control is clicked only after the researcher explicitly requests detection.
export async function detectActiveTikTok(document: Document, url: URL): Promise<{ media: MediaSnapshot | null; notice?: string }> {
  const found = tiktokAdapter.readActiveMedia(document, url);
  if (found) return { media: found, notice: 'Detected the TikTok on screen.' };
  if (!tiktokAdapter.matches(url) || !isForYouPage(url)) return { media: null, notice: 'Open a TikTok post or paste its full link below.' };
  const post = visibleTikTokPost(document);
  const icon = post?.container.querySelector<HTMLElement>(COMMENTS);
  const button = icon?.closest<HTMLElement>('button, [role="button"], a') ?? icon;
  if (!post || !button || !post.container.contains(button)) return { media: null, notice: 'Could not identify the on-screen post. Open its comments or paste its full link below.' };
  button.click();
  return new Promise(resolve => {
    const timer = window.setInterval(() => {
      const media = tiktokAdapter.readActiveMedia(document, new URL(document.location.href));
      if (media) { window.clearInterval(timer); window.clearTimeout(timeout); resolve({ media, notice: 'Detected TikTok after opening its comments.' }); }
    }, 100);
    const timeout = window.setTimeout(() => {
      window.clearInterval(timer);
      resolve({ media: null, notice: 'Comments opened, but no post link was found. Paste its full link below.' });
    }, 3000);
  });
}
