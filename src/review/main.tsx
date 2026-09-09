import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Evaluation, Rubric } from '../domain/types';
import { repository } from '../storage/repository';
import { RubricUpload } from '../shared/RubricUpload';
import { toCsv } from '../domain/export';
import '../shared/styles.css';

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function App() {
  const [rows, setRows] = useState<Evaluation[]>([]);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = () => Promise.all([repository.list(), repository.rubric()]).then(([a,b]) => { setRows(a); setRubric(b); }).catch(() => setError('Could not read saved data.'));
    void load();
    const listener = () => { void load(); };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);
  return <main><h1>ExerciseTok review queue</h1>
    <p role="status">{error}</p>
    <div className="card"><div className="row"><strong>{rows.length} evaluations</strong><div className="actions">
      <button onClick={() => download('exercisetok.json', JSON.stringify(rows, null, 2), 'application/json')}>Export JSON</button>
      <button className="secondary" onClick={() => download('exercisetok.csv', toCsv(rows), 'text/csv')}>Export CSV</button>
    </div></div></div>
    {rows.map(row => <div className="card" key={row.id}>
      <div className="row"><strong>@{row.media.author ?? 'unknown'}</strong><span>{row.status}</span></div>
      <p>{row.media.caption}</p><p>Rater: {row.raterId}</p>
      {row.classification ? <>
        <p>Inclusion: {row.classification.eligibility}</p>
        <p>Automatic: {row.classification.suggested ?? 'Not classified'} • Final: {row.classification.final ?? 'Not classified'}</p>
        <p>{row.classification.reason}</p>
        {row.classification.override && <p>Reviewer override: {row.classification.overrideReason}</p>}
      </> : <p className="muted">Legacy or custom evaluation without automatic classification.</p>}
      <a href={row.media.canonicalUrl} target="_blank" rel="noopener noreferrer">Open on TikTok</a>
      <details><summary>Recorded answers and notes</summary><pre>{JSON.stringify(row.ratings, null, 2)}</pre><p>{row.notes}</p></details>
      <details><summary>Rubric used for this evaluation</summary><pre>{row.rubricSnapshot ? JSON.stringify(row.rubricSnapshot, null, 2) : row.rubricId + ' v' + row.rubricVersion + ' (legacy record; definition not archived)'}</pre></details>
    </div>)}
    {rubric && <RubricUpload rubric={rubric} onApplied={setRubric} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
