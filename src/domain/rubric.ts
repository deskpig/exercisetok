import type { Rubric } from './types';

export const sampleRubric: Rubric = {
  id: 'exercise-content',
  name: 'ExerciseTok coding rubric (replace with study rubric)',
  version: 1,
  fields: [
    { id: 'relevance', label: 'Relevant to exercise?', type: 'boolean', required: true },
    { id: 'content_type', label: 'Content type', type: 'single', required: true, options: ['Instruction', 'Motivation', 'Personal experience', 'Promotion', 'Other'] },
    { id: 'evidence', label: 'Evidence or source mentioned?', type: 'boolean' },
    { id: 'confidence', label: 'Rater confidence', type: 'number', min: 1, max: 5, required: true }
  ]
};

export function validateRubric(rubric: Rubric): string[] {
  const errors: string[] = [];
  if (!rubric.id || !rubric.name || rubric.version < 1) errors.push('Rubric metadata is incomplete.');
  const ids = rubric.fields.map((field) => field.id);
  if (new Set(ids).size !== ids.length) errors.push('Rubric field IDs must be unique.');
  for (const field of rubric.fields) {
    if (!field.id || !field.label) errors.push('Every rubric field needs an id and label.');
    if ((field.type === 'single' || field.type === 'multi') && !field.options?.length) errors.push(`${field.id} needs options.`);
  }
  return errors;
}
