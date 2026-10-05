import { tiktokAdapter, detectActiveTikTok } from '../platforms/tiktok';
import type { ExtensionMessage } from '../domain/types';

const adapter = tiktokAdapter;
const read = () => adapter.matches(new URL(location.href)) ? adapter.readActiveMedia(document, new URL(location.href)) : null;
const scope = window as Window & { exerciseTokCleanup?: () => void };
scope.exerciseTokCleanup?.();

const onMessage = (message: ExtensionMessage, _sender: chrome.runtime.MessageSender, respond: (message: ExtensionMessage) => void) => {
  if (message.type === 'ACTIVE_MEDIA_REQUEST') respond({ type: 'ACTIVE_MEDIA_RESPONSE', media: read() } satisfies ExtensionMessage);
  if (message.type === 'DETECT_ACTIVE_MEDIA_REQUEST') {
    void detectActiveTikTok(document, new URL(location.href)).then(result => respond({ type: 'ACTIVE_MEDIA_RESPONSE', ...result } satisfies ExtensionMessage), () => respond({ type: 'ACTIVE_MEDIA_RESPONSE', media: null, notice: 'Detection failed. Open the post or paste its link.' } satisfies ExtensionMessage));
    return true;
  }
};
chrome.runtime.onMessage.addListener(onMessage);

let previous = '';
const stop = adapter.observe(() => {
  if (!chrome.runtime?.id) { cleanup(); return; }
  const media = read();
  const current = media?.canonicalUrl ?? '';
  if (current !== previous) {
    previous = current;
    try { void chrome.runtime.sendMessage({ type: 'MEDIA_CHANGED', media } satisfies ExtensionMessage).catch(() => undefined); }
    catch { cleanup(); }
  }
});
function cleanup() {
  stop();
  try { chrome.runtime.onMessage.removeListener(onMessage); } catch { /* Previous extension context was unloaded. */ }
  if (scope.exerciseTokCleanup === cleanup) delete scope.exerciseTokCleanup;
}
scope.exerciseTokCleanup = cleanup;
