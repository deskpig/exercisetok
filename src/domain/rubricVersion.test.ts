import { expect, it } from 'vitest';
import { sampleRubric } from './rubric';
import { prepareBuiltInRubric, sameRubricDefinition } from './rubricVersion';

it('replaces conflicting saved criteria with the built-in fields under a new version', () => {
  const saved = { ...sampleRubric, fields: [] };
  const next = prepareBuiltInRubric(sampleRubric, saved);
  expect(next.version).toBe(2);
  expect(next.fields).toEqual(sampleRubric.fields);
  expect(next.classification).toEqual(sampleRubric.classification);
  expect(saved.fields).toEqual([]);
  expect(sampleRubric.version).toBe(1);
});
it('works after the user has manually incremented the saved version', () => {
  expect(prepareBuiltInRubric(sampleRubric, { ...sampleRubric, version: 8, guidance: 'old' }).version).toBe(9);
});
it('is idempotent after the built-in has been applied', () => {
  const first = prepareBuiltInRubric(sampleRubric, { ...sampleRubric, guidance: 'old' });
  expect(prepareBuiltInRubric(sampleRubric, first)).toEqual(first);
});
it('does not confuse reordered JSON keys with changed criteria', () => {
  const reordered = Object.fromEntries(Object.entries(sampleRubric).reverse()) as typeof sampleRubric;
  expect(sameRubricDefinition(sampleRubric, reordered)).toBe(true);
});
it('keeps the built-in version when switching from a different study', () => {
  expect(prepareBuiltInRubric(sampleRubric, { ...sampleRubric, id: 'custom', version: 10 })).toEqual(sampleRubric);
});
it('still detects changed definitions for custom upload conflict checks', () => {
  expect(sameRubricDefinition(sampleRubric, { ...sampleRubric, guidance: 'changed' })).toBe(false);
});
