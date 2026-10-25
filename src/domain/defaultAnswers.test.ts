import { expect, it } from 'vitest';
import { defaultAnswers } from './defaultAnswers';
import { defaultRubric } from './defaultRubric';
import { answerErrors, classify } from './classification';

it('stores absent defaults for every domain and boolean', () => {
  const answers = defaultAnswers(defaultRubric);
  expect(answers.dose).toBe('absent');
  expect(answers.exercise_depression).toBe(false);
  expect(answers.false_claim).toBe(false);
  expect(answers.likes_range).toBe('Not recorded');
  expect(answers.comments_range).toBe('Not recorded');
  expect(answers.treatment_role_framing).toBe('Not mentioned');
  expect(answers.creator_type).toBe('Unclear');
  expect(answers.personal_experience).toBe('Absent');
  expect(answers.evidence_citation).toBe('No citation');
  expect(answers).not.toHaveProperty('views_range');
  expect(answers).not.toHaveProperty('shares');
});
it('uses one inclusion criterion and classifies an untouched form as excluded', () => {
  expect(defaultRubric.classification?.inclusionFields).toEqual(['exercise_depression']);
  expect(classify(defaultRubric, defaultAnswers(defaultRubric)).eligibility).toBe('excluded');
});
it('requires no interaction with absent domains to complete an included record', () => {
  const answers = { ...defaultAnswers(defaultRubric), exercise_depression: true };
  expect(answerErrors(defaultRubric, answers)).toEqual([]);
  expect(classify(defaultRubric, answers).suggested).toBe('partially congruent');
});
it('creates fresh defaults for the next video without retaining prior answers', () => {
  const first = defaultAnswers(defaultRubric);
  first.dose = 'accurate';
  expect(defaultAnswers(defaultRubric).dose).toBe('absent');
});
