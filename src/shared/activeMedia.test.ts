import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { requestActiveMedia } from './activeMedia';

const tab = { id:1, url:'https://www.tiktok.com/foryou' };
const response = { type:'ACTIVE_MEDIA_RESPONSE', media:null };
const send = vi.fn(); const get = vi.fn(); const inject = vi.fn();
beforeEach(() => {
  send.mockReset().mockResolvedValue(response); get.mockReset().mockResolvedValue(tab); inject.mockReset().mockResolvedValue([]);
  vi.stubGlobal('chrome', { tabs:{ sendMessage:send, get }, scripting:{ executeScript:inject } });
});
afterEach(() => vi.unstubAllGlobals());
it.each([false, true])('reconnects after an extension reload for explicit=%s', async explicit => {
  send.mockRejectedValueOnce(new Error('Receiving end does not exist.'));
  expect(await requestActiveMedia(tab, explicit)).toEqual(response);
  expect(inject).toHaveBeenCalledExactlyOnceWith({ target:{ tabId:1 }, files:['assets/content.js'] });
  expect(send).toHaveBeenLastCalledWith(1, { type:explicit ? 'DETECT_ACTIVE_MEDIA_REQUEST' : 'ACTIVE_MEDIA_REQUEST' });
  expect(send).toHaveBeenCalledTimes(2);
});
it('does not inject again when the detector is already responding', async () => {
  await requestActiveMedia(tab, false);
  expect(inject).not.toHaveBeenCalled();
});
it('never injects on an unrelated site or after navigation away from TikTok', async () => {
  await requestActiveMedia({ ...tab, url:'https://example.com' }, true);
  expect(send).not.toHaveBeenCalled();
  send.mockRejectedValueOnce(new Error('Disconnected'));
  get.mockResolvedValue({ ...tab, url:'https://example.com' });
  await expect(requestActiveMedia(tab, true)).rejects.toThrow('no longer on TikTok');
  expect(inject).not.toHaveBeenCalled();
});
it('surfaces a failed repair without repeatedly injecting', async () => {
  send.mockRejectedValue(new Error('Disconnected'));
  await expect(requestActiveMedia(tab, true)).rejects.toThrow('Disconnected');
  expect(inject).toHaveBeenCalledTimes(1);
});
