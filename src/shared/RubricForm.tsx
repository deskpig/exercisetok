import { useId } from 'react';
import type { Rubric, RubricField } from '../domain/types';

type Value = string | string[] | number | boolean;
export function RubricForm({ rubric, values, onChange }: { rubric: Rubric; values: Record<string, Value>; onChange: (id: string, value: Value) => void }) {
  const prefix = useId();
  const renderFields = (fields: RubricField[]) => fields.map(field => {
    const id = prefix + field.id;
    const value = values[field.id] ?? (field.type === 'domain' ? 'absent' : field.type === 'boolean' ? false : '');
    const choices: [string, Value][] = field.type === 'domain'
      ? [['Absent', 'absent'], ['Accurate', 'accurate'], ['Inaccurate', 'inaccurate'], ['Partial', 'partial']]
      : field.type === 'boolean'
      ? [[field.booleanLabels?.[0] ?? 'Absent', false], [field.booleanLabels?.[1] ?? 'Present', true]]
      : (field.options ?? []).map(option => [option, option]);
    const input = <>
      {['domain', 'boolean', 'single'].includes(field.type) && <div className="radio-options">
        {choices.map(([label, answer], index) => <label key={index}>
          <input type="radio" name={id} value={String(answer)} checked={value === answer} onChange={() => onChange(field.id, answer)} />{label}
        </label>)}
      </div>}
      {field.type === 'range' && <div className="range-field">
        <output id={id + '-value'} htmlFor={id}>{String(value)}</output>
        <input id={id} aria-label={field.label} aria-describedby={id + '-value'} aria-valuetext={String(value)} type="range"
          min={field.options ? 0 : field.min} max={field.options ? field.options.length - 1 : field.max} step={field.options ? 1 : field.step ?? 1}
          value={field.options ? Math.max(0, field.options.indexOf(String(value))) : Number(value)}
          onChange={e => onChange(field.id, field.options ? field.options[Number(e.target.value)] : Number(e.target.value))} />
        <div className="range-ends"><span>{field.options?.[0] ?? field.min}</span><span>{field.options?.at(-1) ?? field.max}</span></div>
      </div>}
      {field.type === 'number' && <input aria-label={field.label} type="number" min={field.min} max={field.max} step={field.step ?? 'any'} value={String(value)} onChange={e => onChange(field.id, e.target.value === '' ? '' : Number(e.target.value))} />}
      {field.type === 'text' && <textarea aria-label={field.label} value={String(value)} onChange={e => onChange(field.id, e.target.value)} />}
      {field.type === 'multi' && field.options?.map(option => <label key={option}><input type="checkbox" checked={((values[field.id] as string[]) ?? []).includes(option)} onChange={e => {
        const previous = (values[field.id] as string[]) ?? [];
        onChange(field.id, e.target.checked ? [...previous, option] : previous.filter(x => x !== option));
      }} />{option}</label>)}
    </>;
    return <fieldset className="rubric-field" key={field.id}>
      <legend>{field.label}{field.required ? ' *' : ''}</legend>
      {field.description && <details className="field-help"><summary>Criteria</summary><p>{field.description}</p></details>}
      {field.type === 'text' && !field.required ? <details><summary>Add notes</summary>{input}</details> : input}
    </fieldset>;
  });
  const secondary = rubric.fields.filter(field => field.section === 'secondary');
  return <>{renderFields(rubric.fields.filter(field => field.section !== 'secondary'))}
    {secondary.length > 0 && <details className="secondary-analysis">
      <summary>{secondary.some(field => field.required) ? 'Secondary analysis' : 'Secondary analysis (optional)'}</summary>
      {rubric.secondaryGuidance && <p className="muted">{rubric.secondaryGuidance}</p>}
      {renderFields(secondary)}
    </details>}
  </>;
}
