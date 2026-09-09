import type { Rubric } from './types';
export { defaultRubric as sampleRubric } from './defaultRubric';

export function validateRubric(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Rubric must be an object.'];
  const r = value as Rubric;
  if (typeof r.id !== 'string' || !r.id.trim() || typeof r.name !== 'string' || !r.name.trim() || !Number.isInteger(r.version) || r.version < 1) errors.push('Rubric metadata is incomplete.');
  if (r.guidance !== undefined && typeof r.guidance !== 'string') errors.push('Guidance must be text.');
  if (!Array.isArray(r.fields) || !r.fields.length) return [...errors, 'Fields must be a nonempty array.'];
  const ids = new Set<string>();
  for (const f of r.fields) {
    if (!f || typeof f !== 'object') { errors.push('Invalid field.'); continue; }
    if (typeof f.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(f.id) || ['constructor','prototype','__proto__'].includes(f.id)) errors.push('Use safe, stable field IDs.');
    if (ids.has(f.id)) errors.push('Rubric field IDs must be unique.');
    ids.add(f.id);
    if (typeof f.label !== 'string' || !f.label.trim()) errors.push('Every field needs a label.');
    if (!['single','multi','boolean','number','text','domain'].includes(f.type)) errors.push('Unsupported field type.');
    if (f.description !== undefined && typeof f.description !== 'string') errors.push('Field descriptions must be text.');
    if (f.required !== undefined && typeof f.required !== 'boolean') errors.push('Required must be boolean.');
    if (['single','multi'].includes(f.type) && (!Array.isArray(f.options) || !f.options.length || f.options.some(o => typeof o !== 'string' || !o))) errors.push('Choice fields need text options.');
    if ((f.min !== undefined && !Number.isFinite(f.min)) || (f.max !== undefined && !Number.isFinite(f.max)) || (f.min !== undefined && f.max !== undefined && f.min > f.max)) errors.push('Invalid numeric bounds.');
  }
  const c = r.classification;
  if (c !== undefined) {
    if (!c || typeof c !== 'object') return [...errors, 'Invalid classification configuration.'];
    for (const [key, type] of [['inclusionFields','boolean'], ['domainFields','domain'], ['conflictFields','boolean']] as const) {
      const refs = c[key];
      if (!Array.isArray(refs) || !refs.length || new Set(refs).size !== refs.length || refs.some(id => !r.fields.some(f => f?.id === id && f.type === type))) errors.push('Invalid ' + key + ' references.');
    }
    if (!r.fields.some(f => f?.id === c.actionableField && f.type === 'boolean')) errors.push('Actionable field must reference a boolean field.');
    if (!Number.isInteger(c.accurateThreshold) || c.accurateThreshold < 1 || c.accurateThreshold > (c.domainFields?.length ?? 0)) errors.push('Invalid accurate-domain threshold.');
  }
  return errors;
}
