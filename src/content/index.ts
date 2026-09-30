import { tiktokAdapter, detectActiveTikTok } from '../platforms/tiktok';
import type { ExtensionMessage } from '../domain/types';

const adapter = tiktokAdapter;
const read = () => adapter.matches(new URL(location.href)) ? adapter.readActiveMedia(document, new URL(location.href)) : null;

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, respond) => {
  if (message.type === 'ACTIVE_MEDIA_REQUEST') respond({ type: 'ACTIVE_MEDIA_RESPONSE', media: read() } satisfies ExtensionMessage);
  if (message.type === 'DETECT_ACTIVE_MEDIA_REQUEST') {
    void detectActiveTikTok(document, new URL(location.href)).then(result => respond({ type: 'ACTIVE_MEDIA_RESPONSE', ...result } satisfies ExtensionMessage), () => respond({ type: 'ACTIVE_MEDIA_RESPONSE', media: null, notice: 'Detection failed. Open the post or paste its link.' } satisfies ExtensionMessage));
    return true;
  }
});

let previous = '';
adapter.observe(() => {
  const media = read();
  const current = media?.canonicalUrl ?? '';
  if (current !== previous) {
    previous = current;
    chrome.runtime.sendMessage({ type: 'MEDIA_CHANGED', media } satisfies ExtensionMessage).catch(() => undefined);
  }
});
