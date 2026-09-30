import type { Evaluation, Rubric } from './types';

// Materialize defaults in the saved answers, not just in the visual controls.
export function defaultAnswers(rubric: Rubric): Evaluation['ratings'] {
  const answers: Evaluation['ratings'] = {};
  for (const field of rubric.fields) {
    if (field.default !== undefined) answers[field.id] = structuredClone(field.default);
    else if (field.type === 'domain') answers[field.id] = 'absent';
    else if (field.type === 'boolean') answers[field.id] = false;
    else if (field.type === 'range') answers[field.id] = field.options?.[0] ?? field.min ?? 0;
  }
  return answers;
}
