import type { Rubric } from '../domain/types';

type Value = string | string[] | number | boolean;
export function RubricForm({ rubric, values, onChange }: { rubric: Rubric; values: Record<string, Value>; onChange: (id: string, value: Value) => void }) {
  return <>{rubric.fields.map((field) => <div className="field" key={field.id}>
    <label htmlFor={field.id}>{field.label}{field.required ? ' *' : ''}</label>
    {field.description && <span className="muted">{field.description}</span>}
    {field.type === 'boolean' && <select id={field.id} value={String(values[field.id] ?? '')} onChange={(e) => onChange(field.id, e.target.value === 'true')}><option value="">Select…</option><option value="true">Yes</option><option value="false">No</option></select>}
    {field.type === 'single' && <select id={field.id} value={String(values[field.id] ?? '')} onChange={(e) => onChange(field.id, e.target.value)}><option value="">Select…</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>}
    {field.type === 'number' && <input id={field.id} type="number" min={field.min} max={field.max} value={String(values[field.id] ?? '')} onChange={(e) => onChange(field.id, Number(e.target.value))} />}
    {field.type === 'text' && <textarea id={field.id} value={String(values[field.id] ?? '')} onChange={(e) => onChange(field.id, e.target.value)} />}
    {field.type === 'multi' && field.options?.map((option) => <label key={option}><input type="checkbox" checked={((values[field.id] as string[]) ?? []).includes(option)} onChange={(e) => { const old = (values[field.id] as string[]) ?? []; onChange(field.id, e.target.checked ? [...old, option] : old.filter((x) => x !== option)); }} /> {option}</label>)}
  </div>)}</>;
}
