// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BrowseWorkspace } from './BrowseWorkspace';
import { repository } from '../storage/repository';
import { defaultRubric } from '../domain/defaultRubric';
import { parseTikTokUrl } from '../domain/transfer';
import type { Evaluation, ExtensionMessage, MediaSnapshot, StudySession } from '../domain/types';

const first = parseTikTokUrl('https://www.tiktok.com/@first/video/111');
const second = parseTikTokUrl('https://www.tiktok.com/@second/photo/222');
const third = parseTikTokUrl('https://www.tiktok.com/@third/video/333');
const session: StudySession = { id:'browse-test', mode:'browse', rubric:defaultRubric, queue:[], index:0, createdAt:'2026-10-05T00:00:00Z' };
function event<T extends (...args: any[]) => void>() {
  const listeners = new Set<T>();
  return { addListener:(listener: T) => listeners.add(listener), removeListener:(listener: T) => listeners.delete(listener), emit:(...args: Parameters<T>) => listeners.forEach(listener => listener(...args)) };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
const response = (media: MediaSnapshot | null): ExtensionMessage => ({ type:'ACTIVE_MEDIA_RESPONSE', media });
let host: HTMLDivElement; let root: Root;
let messages: ReturnType<typeof event<(message: ExtensionMessage, sender: chrome.runtime.MessageSender) => void>>;
let send: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  messages = event(); send = vi.fn().mockResolvedValue(response(first));
  vi.stubGlobal('chrome', { runtime:{ id:'test', onMessage:messages }, tabs:{
    query:vi.fn().mockResolvedValue([{ id:1, url:'https://www.tiktok.com/foryou' }]), sendMessage:send,
    onActivated:event(), onUpdated:event()
  }, storage:{ onChanged:event() } });
  vi.spyOn(repository, 'session').mockResolvedValue(session);
  vi.spyOn(repository, 'list').mockResolvedValue([]);
  vi.spyOn(repository, 'rater').mockResolvedValue('');
  vi.spyOn(repository, 'addMedia').mockResolvedValue(session);
  vi.spyOn(repository, 'evaluation').mockResolvedValue(null);
  vi.spyOn(repository, 'save').mockResolvedValue();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const currentUrl = () => host.querySelector('.video-link')?.getAttribute('href');
const change = (media: MediaSnapshot) => messages.emit({ type:'MEDIA_CHANGED', media }, { tab:{ id:1 } as chrome.tabs.Tab });
async function render() { await act(async () => root.render(<BrowseWorkspace session={session} onHome={() => {}} />)); }

it('keeps the next detection while saved answers are loading, and waits for their save', async () => {
  const load = deferred<Evaluation | null>(); const save = deferred<void>();
  vi.mocked(repository.evaluation).mockReturnValueOnce(load.promise);
  vi.mocked(repository.save).mockReturnValueOnce(save.promise);
  await render();
  expect(currentUrl()).toBe(first.canonicalUrl);
  await act(async () => change(second));
  expect(host.textContent).not.toContain('Wait for the saved answers');
  await act(async () => load.resolve(null));
  expect(currentUrl()).toBe(first.canonicalUrl);
  await act(async () => save.resolve());
  expect(currentUrl()).toBe(second.canonicalUrl);
  expect(vi.mocked(repository.save).mock.calls.map(([row]) => row.media.externalId)).toEqual(['111', '222']);
});
it('selects the latest post when several changes arrive while the editor loads', async () => {
  const load = deferred<Evaluation | null>();
  vi.mocked(repository.evaluation).mockReturnValueOnce(load.promise);
  await render();
  await act(async () => { change(second); change(third); });
  await act(async () => load.resolve(null));
  expect(currentUrl()).toBe(third.canonicalUrl);
  expect(vi.mocked(repository.addMedia).mock.calls.map(([, media]) => media.externalId)).toEqual(['111', '333']);
});
it('does not let an old detection response replace a newer automatic change', async () => {
  const stale = deferred<ExtensionMessage>(); send.mockReturnValueOnce(stale.promise);
  await render();
  await act(async () => change(second));
  expect(currentUrl()).toBe(second.canonicalUrl);
  await act(async () => stale.resolve(response(first)));
  expect(currentUrl()).toBe(second.canonicalUrl);
});
it('switches to the manually detected post through the explicit request path', async () => {
  await render(); send.mockResolvedValue(response(second));
  const detect = [...host.querySelectorAll('button')].find(button => button.textContent === 'Detect TikTok')!;
  await act(async () => detect.click());
  expect(send).toHaveBeenLastCalledWith(1, { type:'DETECT_ACTIVE_MEDIA_REQUEST' });
  expect(currentUrl()).toBe(second.canonicalUrl);
});
it('retains the current answers when saving fails instead of changing posts', async () => {
  vi.mocked(repository.save).mockRejectedValueOnce(new Error('Storage full'));
  await render();
  await act(async () => change(second));
  expect(currentUrl()).toBe(first.canonicalUrl);
  expect(host.textContent).toContain('Storage full');
  expect(repository.addMedia).toHaveBeenCalledTimes(1);
});
it('restores the original collection time when a post is revisited', async () => {
  const saved = new Map<string, Evaluation>();
  vi.mocked(repository.save).mockImplementation(async row => { saved.set(row.id, row); });
  vi.mocked(repository.evaluation).mockImplementation(async id => saved.get(id) ?? null);
  await render();
  const original = [...saved.values()][0];
  await act(async () => change(second));
  await act(async () => change(first));
  expect(currentUrl()).toBe(first.canonicalUrl);
  expect(saved.get(original.id)?.collectedAt).toBe(original.collectedAt);
  expect(repository.save).toHaveBeenCalledTimes(2);
});
