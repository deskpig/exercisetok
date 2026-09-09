import type { Rubric } from './types';

// Object key order is irrelevant in uploaded JSON; field/option order is not.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return '{' + Object.keys(object).filter(key => object[key] !== undefined).sort()
      .map(key => JSON.stringify(key) + ':' + canonical(object[key])).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
}

export function sameRubricDefinition(a: Rubric, b: Rubric): boolean {
  const { version: _a, ...definitionA } = a;
  const { version: _b, ...definitionB } = b;
  return canonical(definitionA) === canonical(definitionB);
}

export function prepareBuiltInRubric(template: Rubric, current: Rubric): Rubric {
  if (template.id !== current.id) return { ...template };
  return {
    ...template,
    version: Math.max(template.version,
      sameRubricDefinition(template, current) ? current.version : current.version + 1)
  };
}
