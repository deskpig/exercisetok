import { beforeEach, expect, it, vi } from 'vitest';
import { repository } from './repository';
import { defaultRubric } from '../domain/defaultRubric';
import { newEvaluation } from '../domain/evaluation';
import { parseTikTokUrl } from '../domain/transfer';
import type { StudySession } from '../domain/types';
let data: Record<string, unknown>;
const media = parseTikTokUrl('https://www.tiktok.com/@example/video/123');
const session: StudySession = { id:'a', mode:'review', rubric:defaultRubric, queue:[media], index:0, createdAt:'now' };
beforeEach(async () => {
  data = {};
  vi.stubGlobal('chrome', { runtime:{ id:'test-extension' }, storage:{ local:{
    get: vi.fn(async (key: string | null) => key ? { [key]:data[key] } : structuredClone(data)),
    set: vi.fn(async (values: Record<string, unknown>) => { Object.assign(data, structuredClone(values)); }),
    remove: vi.fn(async (keys: string[]) => { for (const key of keys) delete data[key]; })
  } } });
  await repository.saveSession(session);
});
it('keeps concurrent saves to different videos and restores both', async () => {
  const first = newEvaluation(session, media);
  const second = newEvaluation(session, { ...media, externalId:'456' });
  await Promise.all([repository.save(first), repository.save(second)]);
  expect(await repository.list(session.id)).toHaveLength(2);
  expect(await repository.evaluation(first.id)).toEqual(first);
});
it('isolates sessions and retains legacy records without overwriting them', async () => {
  const legacy = { ...newEvaluation(session, media), id:'legacy', sessionId:undefined };
  data.evaluations = [legacy];
  await repository.save(newEvaluation(session, media));
  await repository.saveSession({ ...session, id:'b' });
  await repository.save(newEvaluation({ ...session, id:'b' }, media));
  expect(await repository.list('a')).toHaveLength(1);
  expect(await repository.list('b')).toHaveLength(1);
  expect(await repository.list()).toHaveLength(3);
  expect(data.evaluations).toEqual([legacy]);
});
it('clears imported queues, current and legacy ratings while keeping preferences', async () => {
  data.evaluations = [{ ...newEvaluation(session, media), id:'legacy', sessionId:undefined }];
  await repository.save(newEvaluation(session, media));
  await repository.setRater('R02');
  await repository.setRubric(defaultRubric);
  await repository.clearResearchData();
  expect(await repository.sessions()).toEqual([]);
  expect(await repository.list()).toEqual([]);
  expect(await repository.rater()).toBe('R02');
  expect(await repository.rubric()).toEqual(defaultRubric);
});
it('does not let an open editor resurrect a cleared session', async () => {
  const row = newEvaluation(session, media);
  await Promise.all([repository.save(row), repository.clearResearchData()]);
  await expect(repository.save(row)).rejects.toThrow('cleared');
  await expect(repository.addMedia(session.id, media)).rejects.toThrow('missing');
  await expect(repository.setIndex(session.id, 0)).rejects.toThrow('missing');
  expect(await repository.sessions()).toEqual([]);
  expect(await repository.list()).toEqual([]);
});
it('rejects a save queued behind clearing instead of recreating deleted ratings', async () => {
  const results = await Promise.allSettled([repository.clearResearchData(), repository.save(newEvaluation(session, media))]);
  expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
  expect(await repository.list()).toEqual([]);
});
it('persists queue position and clamps navigation to the list boundaries', async () => {
  await repository.saveSession(session);
  expect((await repository.setIndex(session.id, 100)).index).toBe(0);
  expect((await repository.session(session.id))?.queue[0].externalId).toBe('123');
});
