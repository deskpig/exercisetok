import { useRef, useState } from 'react';
import type { Rubric } from '../domain/types';
import { sampleRubric, validateRubric } from '../domain/rubric';
import { download } from './download';

export function RubricChoice({ onChoose, busy }: { onChoose: (rubric: Rubric) => void; busy: boolean }) {
  const [help, setHelp] = useState(false);
  const [candidate, setCandidate] = useState<Rubric | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  async function read(file?: File) {
    setError(''); setCandidate(null);
    if (!file) return;
    if (file.size > 1_000_000) return setError('Rubric must be smaller than 1 MB.');
    try {
      const value: unknown = JSON.parse(await file.text());
      const errors = validateRubric(value);
      if (errors.length) return setError(errors.join(' '));
      setCandidate(value as Rubric);
    } catch { setError('Could not read a valid JSON rubric.'); }
  }
  return <section className="card setup-rubric">
    <div className="row"><h2>Choose your rubric</h2><button className="info-button secondary" aria-label="Rubric upload instructions" aria-expanded={help} onClick={() => setHelp(!help)}>ⓘ</button></div>
    {help && <aside className="help-box" role="region" aria-label="Rubric instructions">
      <div className="row"><strong>How rubric uploads work</strong><button className="secondary" onClick={() => setHelp(false)}>Close instructions</button></div>
      <p>Upload a <strong>.json</strong> file, up to 1 MB. Include an <code>id</code>, <code>name</code>, positive integer <code>version</code>, and a <code>fields</code> array.</p>
      <p>Each field needs <code>id</code>, <code>label</code>, and <code>type</code>: boolean, domain, single, multi, number, or text. Choice fields need <code>options</code>. Use <code>description</code> for criteria, <code>required</code> for mandatory answers, and <code>section: "secondary"</code> for collapsible secondary fields.</p>
      <p>The extension validates the JSON, draws the controls from those fields, and stores answers under their IDs. Domains and booleans default to absent. Optional <code>classification</code> references inclusion, domain and conflict fields, an actionable judgment, and an accurate-domain threshold. Without it the rubric is a questionnaire with no automatic classification.</p>
      <p>A rubric snapshot is kept with each session and evaluation. Uploads cannot run scripts. Increment the version when changing your study criteria.</p>
      <button className="secondary" onClick={() => download('exercise-depression-rubric.json', JSON.stringify(sampleRubric, null, 2))}>Download an example schema</button>
    </aside>}
    <div className="setup-options">
      <button disabled={busy} onClick={() => onChoose(sampleRubric)}>Use exercise for depression rubric</button>
      <button disabled={busy} className="secondary" onClick={() => fileRef.current?.click()}>Upload custom rubric</button>
      <input ref={fileRef} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Custom rubric file" onChange={e => { void read(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
    {candidate && <div className="help-box"><p>{candidate.name} · v{candidate.version} · {candidate.fields.length} fields</p><button disabled={busy} onClick={() => onChoose(candidate)}>Use uploaded rubric</button></div>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}
