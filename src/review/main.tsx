import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Evaluation, Rubric } from '../domain/types';
import { validateRubric } from '../domain/rubric';
import { repository } from '../storage/repository';
import '../shared/styles.css';

const download = (name: string, content: string, type: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
const csv = (rows: Evaluation[]) => { const headers = ['id','platform','url','externalId','author','raterId','status','rubricId','rubricVersion','ratings','notes','observedAt','createdAt','updatedAt']; const quote = (v: unknown) => `"${String(v ?? '').replaceAll('"','""')}"`; return [headers.join(','), ...rows.map((r) => [r.id,r.media.platform,r.media.canonicalUrl,r.media.externalId,r.media.author,r.raterId,r.status,r.rubricId,r.rubricVersion,JSON.stringify(r.ratings),r.notes,r.media.observedAt,r.createdAt,r.updatedAt].map(quote).join(','))].join('\n'); };

function App() {
  const [rows, setRows] = useState<Evaluation[]>([]);
  const [rubricText, setRubricText] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { Promise.all([repository.list(), repository.rubric()]).then(([a,b]) => { setRows(a); setRubricText(JSON.stringify(b, null, 2)); }); }, []);
  async function importRubric() { try { const value = JSON.parse(rubricText) as Rubric; const errors = validateRubric(value); if (errors.length) return setMessage(errors.join(' ')); await repository.setRubric(value); setMessage('Rubric saved. Existing evaluations retain their rubric version.'); } catch { setMessage('Rubric is not valid JSON.'); } }
  return <main><h1>ExerciseTok review queue</h1><div className="card"><div className="row"><strong>{rows.length} evaluations</strong><div className="actions"><button onClick={() => download('exercisetok.json', JSON.stringify(rows, null, 2), 'application/json')}>Export JSON</button><button className="secondary" onClick={() => download('exercisetok.csv', csv(rows), 'text/csv')}>Export CSV</button></div></div></div>{rows.map((row) => <div className="card" key={row.id}><div className="row"><strong>@{row.media.author ?? 'unknown'}</strong><span className={row.status === 'complete' ? 'complete' : ''}>{row.status}</span></div><p>{row.media.caption}</p><div className="actions"><a href={row.media.canonicalUrl} target="_blank"><button>Open on TikTok</button></a></div><details><summary>Recorded data</summary><pre>{JSON.stringify(row.ratings, null, 2)}</pre></details></div>)}<div className="card"><h2>Rubric JSON</h2><p className="muted">Paste the study rubric using the documented schema. Increment version when criteria change.</p><textarea style={{minHeight: 360, width: '100%'}} value={rubricText} onChange={(e) => setRubricText(e.target.value)} /><button onClick={importRubric}>Validate and save rubric</button>{message && <p>{message}</p>}</div></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
