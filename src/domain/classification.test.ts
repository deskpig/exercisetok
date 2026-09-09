import { describe, expect, it } from 'vitest';
import { classify, answerErrors } from './classification';
import { sampleRubric, validateRubric } from './rubric';
import type { Evaluation } from './types';
const base: Evaluation['ratings'] = { exercise_depression: true, dose: 'absent', intensity: 'absent', duration: 'absent', indication: 'absent', safety: 'absent', conflict: false, false_claim: false, actionable: false };
const result = (answers: Evaluation['ratings']) => classify(sampleRubric, { ...base, ...answers });
const negatives: Evaluation['ratings'][] = [{ safety: 'inaccurate' }, { conflict: true }, { false_claim: true }];
describe('study classification', () => {
  it('does not classify unanswered inclusion', () => expect(classify(sampleRubric, {}).suggested).toBeNull());
  it('excludes failed inclusion even with false claims', () => expect(result({ exercise_depression: false, false_claim: true })).toMatchObject({ eligibility: 'excluded', suggested: null }));
  it.each([0, 1, 2])('codes %i accurate domains as partial', count => {
    const answers = Object.fromEntries(['dose','intensity'].slice(0,count).map(id => [id,'accurate']));
    expect(result(answers).suggested).toBe('partially congruent');
  });
  it('codes three accurate domains as congruent despite another partial domain', () => expect(result({ dose:'accurate', intensity:'accurate', duration:'accurate', safety:'partial' }).suggested).toBe('congruent'));
  it.each(negatives)('gives negative evidence precedence: %o', negative => expect(result({ dose:'accurate', intensity:'accurate', duration:'accurate', actionable:true, ...negative }).suggested).toBe('incongruent'));
  it('allows actionable reviewer determination below threshold', () => expect(result({ actionable:true }).suggested).toBe('congruent'));
  it('does not count partial characterization as accurate', () => expect(result({ dose:'accurate', intensity:'accurate', duration:'partial' }).suggested).toBe('partially congruent'));
  it('waits for accuracy of present domains', () => expect(result({ dose:'present' }).suggested).toBeNull());
  it('allows completed exclusion with only screening answered', () => expect(answerErrors(sampleRubric, { exercise_depression:false })).toEqual([]));
  it('rejects unfinished domain characterization', () => expect(answerErrors(sampleRubric, { ...base, dose:'present' })).toContain('Check: Frequency / time (dose)'));
  it('uses uploaded references and threshold, not study-specific IDs', () => {
    const rubric = { ...sampleRubric, classification: { inclusionFields:['exercise_depression'], domainFields:['dose'], conflictFields:['conflict'], actionableField:'actionable', accurateThreshold:1 } };
    expect(classify(rubric, { exercise_depression:true, dose:'accurate', conflict:false, actionable:false }).suggested).toBe('congruent');
  });
});
describe('uploaded rubrics', () => {
  it.each([null, [], {}, { ...sampleRubric, fields:[null] }, { ...sampleRubric, classification:{ domainFields:42 } }])('rejects malformed input without throwing: %o', value => expect(validateRubric(value).length).toBeGreaterThan(0));
  it('rejects dangling classification references', () => expect(validateRubric({ ...sampleRubric, classification:{ ...sampleRubric.classification, domainFields:['missing'] } }).length).toBeGreaterThan(0));
  it('accepts a JSON round trip', () => expect(validateRubric(JSON.parse(JSON.stringify(sampleRubric)))).toEqual([]));
});
