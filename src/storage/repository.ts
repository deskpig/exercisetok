import type { Evaluation, Rubric, StudySession, MediaSnapshot } from '../domain/types';
import { sampleRubric } from '../domain/rubric';

export const isExtension = () => typeof chrome !== 'undefined' && !!chrome.runtime?.id;
const PREVIEW_KEY = 'exercisetok-development-preview';
async function readAll(): Promise<Record<string, unknown>> {
  if (isExtension()) return chrome.storage.local.get(null);
  if (import.meta.env.DEV) return JSON.parse(localStorage.getItem(PREVIEW_KEY) || '{}');
  throw new Error('Load this build as a Chrome extension.');
}
async function write(values: Record<string, unknown>) {
  if (isExtension()) return chrome.storage.local.set(values);
  if (!import.meta.env.DEV) throw new Error('Load this build as a Chrome extension.');
  const current = await readAll();
  localStorage.setItem(PREVIEW_KEY, JSON.stringify({ ...current, ...values }));
  window.dispatchEvent(new Event('exercisetok-store'));
}
async function get<T>(key: string, fallback: T): Promise<T> {
  const data = isExtension() ? await chrome.storage.local.get(key) : await readAll();
  return (data[key] as T | undefined) ?? fallback;
}
export function subscribeStore(listener: () => void) {
  if (isExtension()) {
    const changed = (_changes: unknown, area: string) => { if (area === 'local') listener(); };
    chrome.storage.onChanged.addListener(changed);
    return () => chrome.storage.onChanged.removeListener(changed);
  }
  window.addEventListener('storage', listener);
  window.addEventListener('exercisetok-store', listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('exercisetok-store', listener); };
}

export const repository = {
  async list(sessionId?: string): Promise<Evaluation[]> {
    const all = await readAll();
    const legacy = Array.isArray(all.evaluations) ? all.evaluations as Evaluation[] : [];
    const current = Object.entries(all).filter(([key]) => key.startsWith('evaluation:')).map(([, value]) => value as Evaluation);
    const rows = [...new Map([...legacy, ...current].map(row => [row.id, row])).values()];
    return rows.filter(row => sessionId === undefined || row.sessionId === sessionId).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
  },
  async evaluation(id: string) { return get<Evaluation | null>('evaluation:' + id, null); },
  async save(row: Evaluation) { await write({ ['evaluation:' + row.id]: row }); },
  rubric: () => get<Rubric>('rubric', sampleRubric),
  rater: () => get<string>('raterId', ''),
  async setRubric(rubric: Rubric) { await write({ rubric }); },
  async setRater(raterId: string) { await write({ raterId }); },
  async sessions(): Promise<StudySession[]> {
    const all = await readAll();
    return Object.entries(all).filter(([key]) => key.startsWith('session:')).map(([, value]) => value as StudySession).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  },
  session: (id: string) => get<StudySession | null>('session:' + id, null),
  async saveSession(session: StudySession) { await write({ ['session:' + session.id]: session }); },
  async addMedia(sessionId: string, media: MediaSnapshot) {
    const update = async () => {
      const session = await this.session(sessionId);
      if (!session) throw new Error('Session is missing.');
      if (!session.queue.some(item => item.platform === media.platform && item.externalId === media.externalId)) {
        session.queue.push(media);
        await this.saveSession(session);
      }
      return session;
    };
    return navigator.locks ? navigator.locks.request('exercisetok-session:' + sessionId, update) : update();
  },
  async setIndex(sessionId: string, index: number) {
    const session = await this.session(sessionId);
    if (!session) throw new Error('Session is missing.');
    const next = { ...session, index: Math.min(Math.max(index, 0), Math.max(0, session.queue.length - 1)) };
    await this.saveSession(next);
    return next;
  }
};
