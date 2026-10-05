import type { Rubric } from './types';
import { validFieldValue } from './fieldValue';
export { defaultRubric as sampleRubric } from './defaultRubric';

export type RubricPath = (string | number)[];
export interface RubricIssue { message: string; path: RubricPath }
export class RubricValidationError extends Error {
  constructor(public issues: RubricIssue[]) { super(issues.map(issue => issue.message).join(' ')); }
}

// Keep locations structured until the upload layer maps them onto source text.
export function rubricIssues(value: unknown): RubricIssue[] {
  const errors: RubricIssue[] = [];
  const report = (message: string, path: RubricPath) => { errors.push({ message, path }); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [{ message:'Rubric must be an object.', path:[] }];
  const r = value as Rubric;
  if (typeof r.id !== 'string' || !r.id.trim()) report('Rubric ID must be nonempty text.', ['id']);
  if (typeof r.name !== 'string' || !r.name.trim()) report('Rubric name must be nonempty text.', ['name']);
  if (!Number.isInteger(r.version) || r.version < 1) report('Rubric version must be a positive integer.', ['version']);
  if (r.guidance !== undefined && typeof r.guidance !== 'string') report('Guidance must be text.', ['guidance']);
  if (r.secondaryGuidance !== undefined && typeof r.secondaryGuidance !== 'string') report('Secondary guidance must be text.', ['secondaryGuidance']);
  if (!Array.isArray(r.fields) || !r.fields.length) return [...errors, { message:'Fields must be a nonempty array.', path:['fields'] }];
  const ids = new Set<string>();
  for (const [index, f] of r.fields.entries()) {
    const field = (key?: string): RubricPath => ['fields', index, ...(key ? [key] : [])];
    if (!f || typeof f !== 'object' || Array.isArray(f)) { report('Invalid field.', field()); continue; }
    if (typeof f.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(f.id) || ['constructor','prototype','__proto__'].includes(f.id)) report('Use safe, stable field IDs.', field('id'));
    if (ids.has(f.id)) report('Rubric field IDs must be unique.', field('id'));
    ids.add(f.id);
    if (typeof f.label !== 'string' || !f.label.trim()) report('Every field needs a label.', field('label'));
    if (!['single','multi','boolean','number','text','domain','range'].includes(f.type)) report('Unsupported field type.', field('type'));
    if (f.description !== undefined && typeof f.description !== 'string') report('Field descriptions must be text.', field('description'));
    if (f.intro !== undefined && typeof f.intro !== 'string') report('Field introductions must be text.', field('intro'));
    if (f.required !== undefined && typeof f.required !== 'boolean') report('Required must be boolean.', field('required'));
    if (f.section !== undefined && !['primary', 'secondary'].includes(f.section)) report('Invalid field section.', field('section'));
    if ((['single','multi'].includes(f.type) || (f.type === 'range' && f.options !== undefined)) && (!Array.isArray(f.options) || !f.options.length || f.options.some(o => typeof o !== 'string' || !o) || new Set(f.options).size !== f.options.length)) report('Choice fields need unique text options.', field('options'));
    if (f.min !== undefined && !Number.isFinite(f.min)) report('Invalid numeric bounds.', field('min'));
    if (f.max !== undefined && !Number.isFinite(f.max)) report('Invalid numeric bounds.', field('max'));
    if (Number.isFinite(f.min) && Number.isFinite(f.max) && f.min! > f.max!) report('Invalid numeric bounds: max must be at least min.', field('max'));
    if (f.type === 'range' && f.options === undefined && (!Number.isFinite(f.min) || !Number.isFinite(f.max) || f.max! <= f.min!)) report('Numeric ranges need min < max.', field(!Number.isFinite(f.min) ? 'min' : 'max'));
    if (f.step !== undefined && (!Number.isFinite(f.step) || f.step <= 0)) report('Step must be a positive number.', field('step'));
    if (f.booleanLabels !== undefined && (!Array.isArray(f.booleanLabels) || f.booleanLabels.length !== 2 || f.booleanLabels.some(label => typeof label !== 'string' || !label.trim()))) report('Boolean labels must be [false label, true label].', field('booleanLabels'));
    if (f.default !== undefined && !validFieldValue(f, f.default)) report('Invalid default for ' + f.label + '.', field('default'));
  }
  const c = r.classification;
  if (c !== undefined) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return [...errors, { message:'Invalid classification configuration.', path:['classification'] }];
    for (const [key, type] of [['inclusionFields','boolean'], ['domainFields','domain'], ['conflictFields','boolean']] as const) {
      const refs = c[key];
      if (!Array.isArray(refs) || !refs.length || new Set(refs).size !== refs.length) report('Invalid ' + key + ' references.', ['classification', key]);
      else refs.forEach((id, index) => {
        if (!r.fields.some(f => f?.id === id && f.type === type)) report('Invalid ' + key + ' reference: ' + String(id) + '.', ['classification', key, index]);
      });
    }
    if (!r.fields.some(f => f?.id === c.actionableField && f.type === 'boolean')) report('Actionable field must reference a boolean field.', ['classification', 'actionableField']);
    if (!Number.isInteger(c.accurateThreshold) || c.accurateThreshold < 1 || c.accurateThreshold > (c.domainFields?.length ?? 0)) report('Invalid accurate-domain threshold.', ['classification', 'accurateThreshold']);
  }
  return errors;
}

export function validateRubric(value: unknown): string[] {
  return rubricIssues(value).map(issue => issue.message);
}
