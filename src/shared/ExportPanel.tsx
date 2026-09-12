import { useEffect, useState } from 'react';
import type { Evaluation } from '../domain/types';
import { repository, subscribeStore } from '../storage/repository';
import { analysisRows, blindList } from '../domain/transfer';
import { toCsv } from '../domain/export';
import { download } from './download';

export function ExportPanel({ sessionId, beforeExport }: { sessionId?: string; beforeExport?: () => Promise<void> }) {
  const [rows, setRows] = useState<Evaluation[]>([]);
  const [rater, setRater] = useState('');
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const load = () => { void repository.list(sessionId).then(setRows).catch(() => setMessage('Could not load records for export.')); };
    load(); void repository.rater().then(setRater).catch(() => setMessage('Enter your rater ID for analysis exports.'));
    return subscribeStore(load);
  }, [sessionId]);
  const selected = rows.filter(row => includeDrafts || row.status === 'complete');
  async function exportData(format: 'blind' | 'json' | 'csv') {
    try {
      await beforeExport?.();
      // Read the latest persisted records rather than a potentially stale render.
      const current = (await repository.list(sessionId)).filter(row => includeDrafts || row.status === 'complete');
      if (!current.length) return setMessage('No matching records. Complete a rating or include drafts.');
      if (format === 'blind') {
        download('exercisetok-blind-list.json', JSON.stringify(blindList(current), null, 2));
      } else {
        const data = analysisRows(current, rater);
        await repository.setRater(rater.trim());
        if (format === 'csv') download('exercisetok-analysis.csv', toCsv(data), 'text/csv');
        else download('exercisetok-analysis.json', JSON.stringify({ kind: 'exercisetok-analysis', schemaVersion: 1, raterId: rater.trim(), evaluations: data }, null, 2));
      }
      setMessage('Export downloaded.');
    } catch (error) { setMessage((error as Error).message); }
  }
  return <details className="card export-panel">
    <summary>Export & share · {rows.filter(row => row.status === 'complete').length} complete</summary>
    <p className="muted">{selected.length} saved records selected{sessionId ? ' in this session' : ' across sessions'}. Files download to your computer for you to share.</p>
    <label className="check-label"><input type="checkbox" checked={includeDrafts} onChange={e => setIncludeDrafts(e.target.checked)} />Include drafts and unavailable items</label>
    <button disabled={!selected.length} className="secondary" onClick={() => { void exportData('blind'); }}>Download blinded TikTok list</button>
    <p className="muted">Only video IDs and clean links, in collection order. No ratings, notes, researcher IDs, or coding timestamps.</p>
    <div className="field"><label htmlFor="export-rater">Unique rater ID for analysis export</label><input id="export-rater" value={rater} onChange={e => setRater(e.target.value)} placeholder="e.g. R02" /></div>
    <div className="actions"><button disabled={!selected.length || !rater.trim()} onClick={() => { void exportData('csv'); }}>Analysis CSV</button><button disabled={!selected.length || !rater.trim()} className="secondary" onClick={() => { void exportData('json'); }}>Analysis JSON</button></div>
    <p className="muted">Includes your rater ID, links, rubric answers and definition, automatic/final coding, and optional override notes. Use a distinct ID for each researcher; IDs are labels, not accounts.</p>
    {message && <p role="status">{message}</p>}
  </details>;
}
