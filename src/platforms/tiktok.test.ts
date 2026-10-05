// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.tiktok.com/foryou"}
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { detectActiveTikTok, tiktokAdapter } from './tiktok';

const page = () => new URL(window.location.href);
function rect(element: Element, top: number, height = 600) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top, bottom:top + height, left:200, right:560, width:360, height, x:200, y:top, toJSON:() => ({}) });
}
function post(id: string, kind: 'video' | 'photo', top: number, link = true) {
  const article = document.createElement('article');
  article.innerHTML = '<div data-e2e="inner-wrapper"><div>' + (kind === 'video' ? '<video></video>' : '<img alt="slide" />') + '</div></div>' +
    (link ? '<a href="/@creator/' + kind + '/' + id + '">Post</a>' : '') + '<button data-e2e="comment-button">Comments</button>';
  document.body.append(article);
  rect(article, top); rect(article.querySelector('video, img')!, top);
  return article;
}
beforeEach(() => { document.body.innerHTML = ''; window.history.replaceState({}, '', '/foryou'); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

it('detects a direct slideshow permalink without a video element', () => {
  const found = tiktokAdapter.readActiveMedia(document, new URL('https://www.tiktok.com/@creator/photo/123?share=1'));
  expect(found).toMatchObject({ externalId:'123', mediaType:'slideshow', canonicalUrl:'https://www.tiktok.com/@creator/photo/123' });
});
it('finds the FYP link above the inner data-e2e wrapper', () => {
  post('123', 'video', 50);
  expect(tiktokAdapter.readActiveMedia(document, page())?.externalId).toBe('123');
});
it('finds sibling controls outside an inner generated item wrapper', async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<main><div><div class="css-player-DivItemContainer"><video></video></div><button title="Comments">Comments</button></div></main>';
  rect(document.querySelector('video')!, 50);
  document.querySelector('button')!.addEventListener('click', () => window.history.pushState({}, '', '/@creator/video/222'));
  const result = detectActiveTikTok(document, page());
  await vi.advanceTimersByTimeAsync(110);
  expect((await result).media?.externalId).toBe('222');
});
it('detects the outer post link despite generated inner wrappers', () => {
  const active = post('222', 'video', 50);
  active.querySelector('video')!.parentElement!.className = 'css-player-DivItemContainer';
  expect(tiktokAdapter.readActiveMedia(document, page())?.externalId).toBe('222');
});
it('uses visual visibility even if the player is hidden from accessibility APIs', () => {
  const active = post('222', 'photo', 50);
  active.querySelector('img')!.setAttribute('aria-hidden', 'true');
  expect(tiktokAdapter.readActiveMedia(document, page())?.externalId).toBe('222');
  active.style.display = 'none';
  expect(tiktokAdapter.readActiveMedia(document, page())).toBeNull();
});
it('ignores links to other posts quoted in the caption or comments', () => {
  const active = post('222', 'video', 50);
  active.insertAdjacentHTML('beforeend', '<p data-e2e="video-desc"><a href="/@other/video/999">Replying to this</a></p><div data-e2e="comment-item"><a href="/@other/video/888">Another post</a></div>');
  expect(tiktokAdapter.readActiveMedia(document, page())?.externalId).toBe('222');
});
it('chooses the post most visible on screen, not the first video in the DOM', () => {
  post('111', 'video', -450);
  post('222', 'video', 60);
  post('333', 'video', 950);
  expect(tiktokAdapter.readActiveMedia(document, page())?.externalId).toBe('222');
});
it('detects photo posts in a mixed feed and ignores a hidden video', () => {
  post('111', 'video', 20).hidden = true;
  post('222', 'photo', 50);
  expect(tiktokAdapter.readActiveMedia(document, page())).toMatchObject({ externalId:'222', mediaType:'slideshow' });
});
it('does not substitute a neighboring post when the current post has no permalink', () => {
  post('111', 'video', -450);
  post('222', 'photo', 60, false);
  expect(tiktokAdapter.readActiveMedia(document, page())).toBeNull();
});
it('only clicks the active post’s comments on an explicit detection request', async () => {
  vi.useFakeTimers();
  const other = post('111', 'video', -900);
  const active = post('222', 'photo', 50, false);
  const otherClick = vi.fn();
  const activeClick = vi.fn(() => window.history.pushState({}, '', '/@creator/photo/222'));
  other.querySelector('button')!.addEventListener('click', otherClick);
  active.querySelector('button')!.addEventListener('click', activeClick);
  expect(tiktokAdapter.readActiveMedia(document, page())).toBeNull();
  expect(activeClick).not.toHaveBeenCalled();
  const result = detectActiveTikTok(document, page());
  await vi.advanceTimersByTimeAsync(110);
  expect((await result).media).toMatchObject({ externalId:'222', mediaType:'slideshow' });
  expect(activeClick).toHaveBeenCalledTimes(1);
  expect(otherClick).not.toHaveBeenCalled();
});
it('does not click comments when the visible permalink is already available', async () => {
  const active = post('123', 'video', 50);
  const click = vi.fn(); active.querySelector('button')!.addEventListener('click', click);
  expect((await detectActiveTikTok(document, page())).media?.externalId).toBe('123');
  expect(click).not.toHaveBeenCalled();
});
it('does not use the comment fallback on a search results page', async () => {
  window.history.replaceState({}, '', '/search?q=exercise');
  const active = post('123', 'video', 50, false);
  const click = vi.fn(); active.querySelector('button')!.addEventListener('click', click);
  expect((await detectActiveTikTok(document, page())).media).toBeNull();
  expect(click).not.toHaveBeenCalled();
});
it('reports a bounded failure if comments do not expose a link', async () => {
  vi.useFakeTimers(); post('123', 'video', 50, false);
  const result = detectActiveTikTok(document, page());
  await vi.advanceTimersByTimeAsync(3100);
  expect(await result).toMatchObject({ media:null, notice:expect.stringContaining('Paste its full link') });
});
it('observes scrolling when the feed DOM itself has not changed', async () => {
  vi.useFakeTimers();
  post('123', 'video', 50);
  const change = vi.fn();
  const stop = tiktokAdapter.observe(change);
  await vi.advanceTimersByTimeAsync(160);
  change.mockClear();
  document.dispatchEvent(new Event('scroll', { bubbles:true }));
  await vi.advanceTimersByTimeAsync(160);
  expect(change).toHaveBeenCalledTimes(1);
  stop();
});
it('rejects lookalike domains', () => {
  expect(tiktokAdapter.matches(new URL('https://nottiktok.com/@a/photo/123'))).toBe(false);
  expect(tiktokAdapter.readActiveMedia(document, new URL('https://www.tiktok.com.evil.test/@a/video/123'))).toBeNull();
});
it('rechecks recycled feed players without URL or scroll changes, and stops cleanly', async () => {
  vi.useFakeTimers();
  const first = post('111', 'video', 50);
  const next = post('222', 'video', 950);
  const seen: (string | undefined)[] = [];
  const stop = tiktokAdapter.observe(() => seen.push(tiktokAdapter.readActiveMedia(document, page())?.externalId));
  await vi.advanceTimersByTimeAsync(160);
  rect(first, -950); rect(first.querySelector('video')!, -950);
  rect(next, 50); rect(next.querySelector('video')!, 50);
  await vi.advanceTimersByTimeAsync(1000);
  expect(seen).toEqual(['111', '222']);
  stop();
  await vi.advanceTimersByTimeAsync(1200);
  expect(seen).toHaveLength(2);
});
