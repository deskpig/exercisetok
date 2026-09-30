import { expect, it } from 'vitest';
import { normalizeRubric } from './rubricImport';
import { fieldExamples, bandExample } from './rubricExamples';
import { defaultAnswers } from './defaultAnswers';
import { answerErrors } from './classification';
import { defaultRubric } from './defaultRubric';
import { toCsv } from './export';
import { newEvaluation } from './evaluation';
import { parseTikTokUrl } from './transfer';

it('accepts a field name alone and generates repeatable metadata', () => {
  const simple = { fields: [{ field: 'Notes' }] };
  const rubric = normalizeRubric(simple);
  expect(rubric.fields[0]).toMatchObject({ label: 'Notes', type: 'text' });
  expect(rubric.version).toBe(1);
  expect(rubric.classification).toBeUndefined();
  expect(normalizeRubric(simple)).toEqual(rubric);
  expect(normalizeRubric(simple.fields)).toEqual(rubric);
  expect(normalizeRubric({ fields: [{ field: 'Other notes' }] }).id).not.toBe(rubric.id);
});
it.each(Object.entries(fieldExamples))('imports the clickable %s example with its default', (_name, example) => {
  const rubric = normalizeRubric({ fields: [example] });
  const answers = defaultAnswers(rubric);
  expect(answers[rubric.fields[0].id]).toEqual(example['field-default']);
  expect(answerErrors(rubric, answers)).toEqual([]);
});
it('accepts both labeled bands and numeric ranges without mandatory defaults', () => {
  const rubric = normalizeRubric({ fields: [bandExample, { field: 'Score', 'field-type': 'range' }] });
  const answers = defaultAnswers(rubric);
  expect(answers[rubric.fields[0].id]).toBe('Not recorded');
  expect(answers[rubric.fields[1].id]).toBe(0);
  expect(answerErrors(rubric, { ...answers, [rubric.fields[1].id]: 101 })).toHaveLength(1);
});
it('preserves an existing advanced rubric and its classification', () => {
  const result = normalizeRubric(defaultRubric);
  expect(JSON.parse(JSON.stringify(result))).toEqual(defaultRubric);
  expect(defaultAnswers(result)).toEqual(defaultAnswers(defaultRubric));
});
it('generates distinct IDs for repeated and non-Latin field names', () => {
  const rubric = normalizeRubric({ fields: [{ field: 'Notes' }, { field: 'Notes' }, { field: '运动' }] });
  expect(new Set(rubric.fields.map(field => field.id)).size).toBe(3);
});
it.each([
  { field: 'X', 'field-type': 'options', 'field-values': ['A'], 'field-default': 'B' },
  { field: 'X', 'field-type': 'options', 'field-values': ['A', 'A'] },
  { field: 'X', 'field-type': 'range', 'field-values': { min: 5, max: 2 } },
  { field: 'X', 'field-type': 'range', 'field-values': { min: 0, max: 10, step: 0 } },
  { field: 'X', 'field-type': 'range', 'field-values': { min: 0, max: 10, step: 2 }, 'field-default': 3 },
  { field: 'X', 'field-type': 'custom-number', 'field-default': 'zero' },
  { field: 'X', id: '__proto__' },
  { field: 'X', 'field-type': 'script' }
])('rejects invalid values without requiring extra metadata: %j', field => {
  expect(() => normalizeRubric({ fields: [field] })).toThrow();
});
it('exports engagement bands as categories instead of invented exact counts', () => {
  const media = parseTikTokUrl('https://www.tiktok.com/@example/photo/123');
  const row = newEvaluation({ id:'test', mode:'browse', rubric:defaultRubric, queue:[media], index:0, createdAt:'now' }, media);
  row.ratings.views_range = '1,000,000–9,999,999';
  const csv = toCsv([row]);
  expect(csv).toContain('rating.views_range');
  expect(csv).toContain('"1,000,000–9,999,999"');
  expect(csv).toContain('"slideshow"');
  expect(csv).not.toContain('rating.likes');
  expect(csv).not.toContain('rating.shares');
});
