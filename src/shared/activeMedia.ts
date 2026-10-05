import type { ExtensionMessage } from '../domain/types';

type ActiveResponse = Extract<ExtensionMessage, { type: 'ACTIVE_MEDIA_RESPONSE' }>;
const reconnecting = new Map<number, Promise<void>>();
const supported = (value?: string) => {
  try { const url = new URL(value ?? ''); return url.protocol === 'https:' && url.hostname === 'www.tiktok.com'; }
  catch { return false; }
};

export async function requestActiveMedia(tab: Pick<chrome.tabs.Tab, 'id' | 'url'>, explicit: boolean): Promise<ActiveResponse> {
  if (tab.id === undefined || !supported(tab.url)) return { type:'ACTIVE_MEDIA_RESPONSE', media:null, notice:'Open a TikTok tab to detect its current post.' };
  const tabId = tab.id;
  const message: ExtensionMessage = { type:explicit ? 'DETECT_ACTIVE_MEDIA_REQUEST' : 'ACTIVE_MEDIA_REQUEST' };
  const send = async (): Promise<ActiveResponse> => {
    const response = await chrome.tabs.sendMessage(tabId, message) as ActiveResponse | undefined;
    if (response?.type !== 'ACTIVE_MEDIA_RESPONSE') throw new Error('No response from the TikTok detector.');
    return response;
  };
  try { return await send(); }
  catch {
    // Reconnect existing tabs after an extension update, using only our bundled
    // script on the permitted TikTok host. Concurrent requests share one repair.
    let reconnect = reconnecting.get(tabId);
    if (!reconnect) {
      reconnect = (async () => {
        const current = await chrome.tabs.get(tabId);
        if (!supported(current.url)) throw new Error('The tab is no longer on TikTok.');
        await chrome.scripting.executeScript({ target:{ tabId }, files:['assets/content.js'] });
      })();
      reconnecting.set(tabId, reconnect);
    }
    try { await reconnect; }
    finally { if (reconnecting.get(tabId) === reconnect) reconnecting.delete(tabId); }
    return send();
  }
}
