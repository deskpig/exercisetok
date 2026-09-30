import { useRef, useState } from 'react';
import type { Rubric } from '../domain/types';
import { sampleRubric } from '../domain/rubric';
import { normalizeRubric } from '../domain/rubricImport';
import { RubricInstructions } from './RubricInstructions';

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
      const value: unknown = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
      setCandidate(normalizeRubric(value));
    } catch (cause) { setError(cause instanceof SyntaxError ? 'Could not read JSON. Download an example to start.' : (cause as Error).message); }
  }
  return <section className="card setup-rubric">
    <div className="row"><h2>Choose your rubric</h2><button className="info-button secondary" aria-label="Rubric upload instructions" aria-expanded={help} onClick={() => setHelp(!help)}>ⓘ</button></div>
    {help && <RubricInstructions onClose={() => setHelp(false)} />}
    <div className="setup-options">
      <button disabled={busy} onClick={() => onChoose(sampleRubric)}>Use exercise for depression rubric</button>
      <button disabled={busy} className="secondary" onClick={() => fileRef.current?.click()}>Upload custom rubric</button>
      <input ref={fileRef} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Custom rubric file" onChange={e => { void read(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
    {candidate && <div className="help-box"><p>{candidate.name} · v{candidate.version} · {candidate.fields.length} fields</p><button disabled={busy} onClick={() => onChoose(candidate)}>Use uploaded rubric</button></div>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}
