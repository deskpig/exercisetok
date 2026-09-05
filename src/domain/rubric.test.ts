import { describe, expect, it } from 'vitest';
import { sampleRubric, validateRubric } from './rubric';

describe('validateRubric', () => {
  it('accepts the sample rubric', () => expect(validateRubric(sampleRubric)).toEqual([]));
  it('rejects duplicate field IDs', () => expect(validateRubric({ ...sampleRubric, fields: [sampleRubric.fields[0], sampleRubric.fields[0]] })).toContain('Rubric field IDs must be unique.'));
});
