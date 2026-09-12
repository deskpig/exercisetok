import { beforeEach, expect, it, vi } from 'vitest';
import { repository } from './repository';
import { defaultRubric } from '../domain/defaultRubric';
import { newEvaluation } from '../domain/evaluation';
import { parseTikTokUrl } from '../domain/transfer';
import type { StudySession } from '../domain/types';
let data: Record<string, unknown>;
const media = parseTikTokUrl('https://www.tiktok.com/@example/video/123');
const session: StudySession = { id:'a', mode:'review', rubric:defaultRubric, queue:[media], index:0, createdAt:'now' };
beforeEach(() => {
  data = {};
  vi.stubGlobal('chrome', { runtime:{ id:'test-extension' }, storage:{ local:{
    get: vi.fn(async (key: string | null) => key ? { [key]:data[key] } : structuredClone(data)),
    set: vi.fn(async (values: Record<string, unknown>) => { Object.assign(data, structuredClone(values)); })
  } } });
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
  await repository.save(newEvaluation({ ...session, id:'b' }, media));
  expect(await repository.list('a')).toHaveLength(1);
  expect(await repository.list('b')).toHaveLength(1);
  expect(await repository.list()).toHaveLength(3);
  expect(data.evaluations).toEqual([legacy]);
});
it('persists queue position and clamps navigation to the list boundaries', async () => {
  await repository.saveSession(session);
  expect((await repository.setIndex(session.id, 100)).index).toBe(0);
  expect((await repository.session(session.id))?.queue[0].externalId).toBe('123');
});
