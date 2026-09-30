import type { Answer, RubricField } from './types';

export function validFieldValue(field: RubricField, value: unknown): value is Answer {
  if (field.type === 'boolean') return typeof value === 'boolean';
  if (field.type === 'domain') return typeof value === 'string' && ['absent', 'accurate', 'inaccurate', 'partial'].includes(value);
  if (field.type === 'single' || (field.type === 'range' && field.options !== undefined)) return typeof value === 'string' && Array.isArray(field.options) && field.options.includes(value);
  if (field.type === 'multi') return Array.isArray(value) && Array.isArray(field.options) && value.every(item => typeof item === 'string' && field.options!.includes(item));
  if (field.type === 'number' || field.type === 'range') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) return false;
    const step = field.step ?? (field.type === 'range' ? 1 : undefined);
    if (step !== undefined) {
      const offset = (value - (field.min ?? 0)) / step;
      if (Math.abs(offset - Math.round(offset)) > 1e-7) return false;
    }
    return true;
  }
  return field.type === 'text' && typeof value === 'string';
}
