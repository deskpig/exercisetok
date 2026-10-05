import type { Rubric, RubricField } from './types';
import { rubricIssues, RubricValidationError, type RubricPath } from './rubric';

const aliases: Record<string, string> = { options: 'single', range: 'range', 'custom-string': 'text', 'custom-number': 'number' };
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
function schemaId(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return 'custom-' + (hash >>> 0).toString(16).padStart(8, '0');
}

// Accept the small upload format and the existing full schema; storage keeps one normalized shape.
export function normalizeRubric(value: unknown): Rubric {
  const fail = (message: string, path: RubricPath): never => { throw new RubricValidationError([{ message, path }]); };
  const fieldPath = (index: number, key?: string): RubricPath => [...(Array.isArray(value) ? [] : ['fields']), index, ...(key ? [key] : [])];
  const input = Array.isArray(value) ? { fields: value } : value;
  if (!input || typeof input !== 'object') fail('Use a JSON object with a fields array.', []);
  const source = input as Record<string, unknown>;
  if (!Array.isArray(source.fields) || !source.fields.length) fail('Add at least one item to fields.', Array.isArray(value) ? [] : ['fields']);
  const used = new Set<string>();
  const fields = (source.fields as unknown[]).map((item: unknown, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail('Field ' + (index + 1) + ' must be an object.', fieldPath(index));
    const f = item as Record<string, unknown>;
    const label = f.field ?? f.label;
    if (typeof label !== 'string' || !label.trim()) return fail('Field ' + (index + 1) + ' needs a field name.', fieldPath(index, f.field != null ? 'field' : 'label'));
    const chosen = f['field-type'] ?? f.type ?? 'custom-string';
    if (typeof chosen !== 'string') return fail('Invalid field-type for ' + label + '.', fieldPath(index, f['field-type'] != null ? 'field-type' : 'type'));
    const type = Object.hasOwn(aliases, chosen) ? aliases[chosen] : chosen;
    const stem = 'f_' + (slug(label) || String(index + 1));
    let id = f.id ?? stem;
    if (f.id === undefined) { let suffix = 2; while (used.has(String(id))) id = stem + '_' + suffix++; }
    used.add(String(id));
    const values = f['field-values'];
    if (values !== undefined && !['single', 'multi', 'range', 'number'].includes(type)) fail('Omit field-values for ' + label + '; its value is entered freely.', fieldPath(index, 'field-values'));
    if (values !== undefined && (type === 'number' || (type === 'range' && !Array.isArray(values))) && (!values || typeof values !== 'object' || Array.isArray(values))) fail('Use {"min": 0, "max": 10} for numeric field-values.', fieldPath(index, 'field-values'));
    const bounds = values && typeof values === 'object' && !Array.isArray(values) ? values as Record<string, unknown> : {};
    const options = values !== undefined && ['single', 'multi'].includes(type) ? values : Array.isArray(values) ? values : f.options;
    const numericRange = type === 'range' && options === undefined;
    return {
      id, label: label.trim(), type, options,
      min: bounds.min ?? f.min ?? (numericRange ? 0 : undefined),
      max: bounds.max ?? f.max ?? (numericRange ? 100 : undefined),
      step: bounds.step ?? f.step,
      default: Object.hasOwn(f, 'field-default') ? f['field-default'] : f.default,
      description: f.description, intro: f.intro, required: f.required, section: f.section, booleanLabels: f.booleanLabels
    } as RubricField;
  });
  const definition = { name: source.name ?? 'Custom rubric', fields, guidance: source.guidance, secondaryGuidance: source.secondaryGuidance, classification: source.classification };
  const normalized = { ...definition, id: source.id ?? schemaId(JSON.stringify(definition)), version: source.version ?? 1 } as Rubric;
  const errors = rubricIssues(normalized).map(issue => {
    if (issue.path[0] !== 'fields' || typeof issue.path[1] !== 'number') return issue;
    const index = issue.path[1];
    const field = (source.fields as Record<string, unknown>[])[index];
    let key = issue.path[2] as string | undefined;
    if (key === 'label' && field.field != null) key = 'field';
    if (key === 'type' && field['field-type'] != null) key = 'field-type';
    if (key === 'default' && Object.hasOwn(field, 'field-default')) key = 'field-default';
    if (key === 'options' && field['field-values'] !== undefined) key = 'field-values';
    const bounds = field['field-values'] as Record<string, unknown> | undefined;
    if (key && ['min', 'max', 'step'].includes(key) && bounds && bounds[key] != null) {
      return { ...issue, path:[...fieldPath(index, 'field-values'), key] };
    }
    return { ...issue, path:fieldPath(index, key) };
  });
  if (errors.length) throw new RubricValidationError(errors);
  return normalized;
}
