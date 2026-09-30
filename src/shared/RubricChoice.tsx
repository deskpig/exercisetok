import { useRef, useState } from 'react';
import type { Rubric } from '../domain/types';
import { sampleRubric } from '../domain/rubric';
import { readRubricFile } from '../domain/rubricFile';
import { RubricInstructions } from './RubricInstructions';

export function RubricChoice({ onChoose, busy }: { onChoose: (rubric: Rubric) => void; busy: boolean }) {
  const [help, setHelp] = useState(false);
  const [candidate, setCandidate] = useState<Rubric | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  async function read(file?: File) {
    const token = ++request.current;
    setError(''); setCandidate(null);
    if (!file) { setReading(false); return; }
    setReading(true);
    try {
      const rubric = await readRubricFile(file);
      if (token === request.current) setCandidate(rubric);
    } catch (cause) { if (token === request.current) setError((cause as Error).message); }
    finally { if (token === request.current) setReading(false); }
  }
  return <section className="card setup-rubric">
    <h2>Choose your rubric</h2>
    <div className="setup-options">
      <button disabled={busy} onClick={() => onChoose(sampleRubric)}>Use exercise for depression rubric</button>
      <button disabled={busy} className="secondary" aria-expanded={help} aria-controls="custom-rubric-upload" onClick={() => setHelp(true)}>Upload custom rubric</button>
    </div>
    {help && <div id="custom-rubric-upload"><RubricInstructions onClose={() => setHelp(false)}>
      <div className="rubric-upload-controls">
        <button disabled={busy || reading} onClick={() => fileRef.current?.click()}>{reading ? 'Reading file…' : 'Choose JSON file'}</button>
        <input ref={fileRef} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Custom rubric file" onChange={e => { void read(e.target.files?.[0]); e.target.value = ''; }} />
        {candidate && <div className="help-box"><p>{candidate.name} · v{candidate.version} · {candidate.fields.length} fields</p><button disabled={busy || reading} onClick={() => onChoose(candidate)}>Use uploaded rubric</button></div>}
        {error && <div role="alert" className="error upload-error">{error}</div>}
      </div>
    </RubricInstructions></div>}
  </section>;
}
