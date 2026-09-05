import type { Evaluation, Rubric } from '../domain/types';
import { sampleRubric } from '../domain/rubric';

const KEYS = { evaluations: 'evaluations', rubric: 'rubric', rater: 'raterId' } as const;

async function get<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T | undefined) ?? fallback;
}

export const repository = {
  list: () => get<Evaluation[]>(KEYS.evaluations, []),
  rubric: () => get<Rubric>(KEYS.rubric, sampleRubric),
  rater: () => get<string>(KEYS.rater, 'researcher-1'),
  async save(evaluation: Evaluation) {
    const rows = await this.list();
    const index = rows.findIndex((row) => row.id === evaluation.id);
    if (index >= 0) rows[index] = evaluation; else rows.push(evaluation);
    await chrome.storage.local.set({ [KEYS.evaluations]: rows });
  },
  async setRubric(rubric: Rubric) { await chrome.storage.local.set({ [KEYS.rubric]: rubric }); },
  async setRater(raterId: string) { await chrome.storage.local.set({ [KEYS.rater]: raterId }); }
};
