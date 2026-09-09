import type { Evaluation, Rubric } from './types';

// Materialize defaults in the saved answers, not just in the visual controls.
export function defaultAnswers(rubric: Rubric): Evaluation['ratings'] {
  const answers: Evaluation['ratings'] = {};
  for (const field of rubric.fields) {
    if (field.type === 'domain') answers[field.id] = 'absent';
    if (field.type === 'boolean') answers[field.id] = false;
  }
  return answers;
}
