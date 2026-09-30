import type { Rubric, RubricField } from './types';
import { validateRubric } from './rubric';

const aliases: Record<string, string> = { options: 'single', range: 'range', 'custom-string': 'text', 'custom-number': 'number' };
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
function schemaId(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return 'custom-' + (hash >>> 0).toString(16).padStart(8, '0');
}

// Accept the small upload format and the existing full schema; storage keeps one normalized shape.
export function normalizeRubric(value: unknown): Rubric {
  const input = Array.isArray(value) ? { fields: value } : value;
  if (!input || typeof input !== 'object') throw new Error('Use a JSON object with a fields array.');
  const source = input as Record<string, unknown>;
  if (!Array.isArray(source.fields) || !source.fields.length) throw new Error('Add at least one item to fields.');
  const used = new Set<string>();
  const fields = source.fields.map((item: unknown, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Field ' + (index + 1) + ' must be an object.');
    const f = item as Record<string, unknown>;
    const label = f.field ?? f.label;
    if (typeof label !== 'string' || !label.trim()) throw new Error('Field ' + (index + 1) + ' needs a field name.');
    const chosen = f['field-type'] ?? f.type ?? 'custom-string';
    if (typeof chosen !== 'string') throw new Error('Invalid field-type for ' + label + '.');
    const type = Object.hasOwn(aliases, chosen) ? aliases[chosen] : chosen;
    const stem = 'f_' + (slug(label) || String(index + 1));
    let id = f.id ?? stem;
    if (f.id === undefined) { let suffix = 2; while (used.has(String(id))) id = stem + '_' + suffix++; }
    used.add(String(id));
    const values = f['field-values'];
    if (values !== undefined && !['single', 'multi', 'range', 'number'].includes(type)) throw new Error('Omit field-values for ' + label + '; its value is entered freely.');
    if (values !== undefined && (type === 'number' || (type === 'range' && !Array.isArray(values))) && (!values || typeof values !== 'object' || Array.isArray(values))) throw new Error('Use {"min": 0, "max": 10} for numeric field-values.');
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
  const errors = validateRubric(normalized);
  if (errors.length) throw new Error(errors.join(' '));
  return normalized;
}
