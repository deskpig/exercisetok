import { useState } from 'react';
import type { Rubric } from '../domain/types';
import { sampleRubric, validateRubric } from '../domain/rubric';
import { repository } from '../storage/repository';

export function RubricUpload({ rubric, onApplied }: { rubric: Rubric; onApplied: (r: Rubric) => void }) {
  const [candidate, setCandidate] = useState<Rubric | null>(null);
  const [message, setMessage] = useState('');
  async function read(file?: File) {
    setCandidate(null); setMessage('');
    if (!file) return;
    if (file.size > 1_000_000) return setMessage('Rubric must be smaller than 1 MB.');
    try {
      const value: unknown = JSON.parse(await file.text());
      const errors = validateRubric(value);
      if (errors.length) return setMessage(errors.join(' '));
      setCandidate(value as Rubric);
    } catch { setMessage('Could not read a valid JSON rubric.'); }
  }
  async function apply() {
    if (!candidate) return;
    if (candidate.id === rubric.id && candidate.version === rubric.version && JSON.stringify(candidate) !== JSON.stringify(rubric)) {
      return setMessage('Increment the version when changing an existing rubric.');
    }
    try {
      await repository.setRubric(candidate);
      onApplied(candidate); setCandidate(null); setMessage('Rubric applied.');
    } catch { setMessage('Could not save the rubric. Please retry.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(rubric, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'rubric.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <details className="card"><summary>Upload or download a project rubric</summary>
    <p>{rubric.name} (version {rubric.version})</p>
    <p className="muted">Download the current JSON as a template. Edit fields, criteria and classification references for your study, then upload. Applying a rubric clears the current unsaved form; saved evaluations remain intact.</p>
    <div className="field"><label htmlFor="rubric-file">Rubric JSON file</label><input id="rubric-file" type="file" accept=".json,application/json" onChange={e => { void read(e.target.files?.[0]); e.target.value = ''; }} /></div>
    <div className="actions"><button className="secondary" onClick={download}>Download current rubric</button><button className="secondary" onClick={() => { setCandidate(sampleRubric); setMessage(''); }}>Choose exercise/depression rubric</button></div>
    {candidate && <><p>Ready: {candidate.name}, version {candidate.version}, {candidate.fields.length} fields.</p><button onClick={apply}>Apply rubric and clear unsaved form</button></>}
    <p role="status">{message}</p>
  </details>;
}
