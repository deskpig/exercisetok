import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Congruence, Evaluation, MediaSnapshot, StudySession } from '../domain/types';
import { evaluationId, newEvaluation, updateEvaluation } from '../domain/evaluation';
import { answerErrors } from '../domain/classification';
import { repository } from '../storage/repository';
import { RubricForm } from './RubricForm';

export interface EditorHandle { flush: () => Promise<void> }
export const EvaluationEditor = forwardRef<EditorHandle, {
  session: StudySession; media: MediaSnapshot; onComplete?: () => Promise<void>;
}>(function EvaluationEditor({ session, media, onComplete }, ref) {
  const [row, setRow] = useState<Evaluation | null>(null);
  const [message, setMessage] = useState('Loading saved answers…');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const current = useRef<Evaluation | null>(null);
  const tail = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  const rubric = session.rubric;
  function persist(next: Evaluation) {
    current.current = next; setRow(next); setPending(true); setError('');
    const task = tail.current.catch(() => undefined).then(() => repository.save(next));
    tail.current = task;
    void task.then(() => {
      if (mounted.current && current.current === next) { setPending(false); setMessage(next.status === 'complete' ? 'Saved complete' : 'Draft saved automatically'); }
    }, () => {
      if (mounted.current) { setPending(false); setError('Could not save. Keep this view open and click Save draft to retry.'); }
    });
  }
  useImperativeHandle(ref, () => ({
    async flush() {
      if (!current.current) throw new Error('Wait for the saved answers to load.');
      await tail.current;
    }
  }));
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void repository.evaluation(evaluationId(session, media)).then(saved => {
      if (cancelled) return;
      const next = saved ?? newEvaluation(session, media);
      current.current = next; setRow(next); setMessage(saved ? 'Saved answers restored' : 'New draft');
      if (!saved) persist(next);
    }).catch(() => { if (!cancelled) setError('Could not load this evaluation. Reopen the session to retry.'); });
    return () => { cancelled = true; mounted.current = false; };
  }, []);

  function edit(changes: Partial<Pick<Evaluation, 'ratings' | 'notes' | 'availability'>>, override?: Congruence | null, reason?: string) {
    if (!current.current) return;
    persist(updateEvaluation(current.current, { ...changes, status: 'draft' }, override, reason));
  }
  function answer(id: string, value: Evaluation['ratings'][string]) {
    if (!current.current) return;
    const c = rubric.classification;
    const affectsScore = c && [...c.inclusionFields, ...c.domainFields, ...c.conflictFields, c.actionableField].includes(id);
    edit({ ratings: { ...current.current.ratings, [id]: value } }, affectsScore ? null : undefined, affectsScore ? '' : undefined);
  }
  async function saveComplete() {
    if (!current.current) return;
    const errors = answerErrors(rubric, current.current.ratings);
    if (current.current.availability === 'unavailable') errors.push('Unavailable videos remain drafts. Move to the next item or restore availability after viewing it.');
    if (errors.length) return setError(errors.join(' '));
    const next = updateEvaluation(current.current, { status: 'complete', availability: 'available' });
    persist(next);
    try { await tail.current; await onComplete?.(); }
    catch { setError('Could not finish saving or move to the next item. Your answers remain in this view.'); }
  }
  return <section className="card evaluation-editor" aria-label="Coding rubric">
    <div className="row"><h2>Code this video</h2><span className="save-state" role="status">{pending ? 'Saving…' : message}</span></div>
    {error && <p className="error" role="alert">{error}</p>}
    {row && <>
      <details className="criteria"><summary>Encoding criteria · {rubric.name}</summary><p>{rubric.guidance || 'Read the criteria beside each field.'}</p></details>
      <p className="muted">Absent is the default. Accurate / inaccurate / partial means present.</p>
      <RubricForm rubric={rubric} values={row.ratings} onChange={answer} />
      {row.classification && <section className="classification" aria-label="Global encoding">
        <div className="row"><h3>Global encoding</h3><strong>{row.classification.final ?? 'Not classified'}</strong></div>
        <p className="muted">Inclusion: {row.classification.eligibility} · Automatic: {row.classification.suggested ?? 'Not classified'}</p>
        <details><summary>Why this classification?</summary><p>{row.classification.reason}</p></details>
        <div className="field"><label htmlFor="override">Reviewer override</label><select id="override" disabled={row.classification.eligibility !== 'included'} value={row.classification.override ?? ''} onChange={e => edit({}, (e.target.value || null) as Congruence | null)}>
          <option value="">Use automatic classification</option><option value="congruent">Congruent</option><option value="incongruent">Incongruent</option><option value="partially congruent">Partially congruent</option>
        </select></div>
        {row.classification.override && <div className="field"><label htmlFor="override-reason">Override reason (optional)</label><textarea id="override-reason" value={row.classification.overrideReason} onChange={e => edit({}, undefined, e.target.value)} /></div>}
      </section>}
      <details className="field"><summary>Notes / supporting quotations</summary><textarea aria-label="Notes / supporting quotations" value={row.notes} onChange={e => edit({ notes: e.target.value })} /></details>
      <label className="check-label"><input type="checkbox" checked={row.availability === 'unavailable'} onChange={e => edit({ availability: e.target.checked ? 'unavailable' : 'not-checked' })} />Video unavailable / cannot assess</label>
      <div className="actions editor-actions">
        <button disabled={pending} onClick={() => { void saveComplete(); }}>{onComplete ? 'Complete & next' : 'Save complete'}</button>
        <button className="secondary" onClick={() => edit({})}>Save draft</button>
      </div>
      <p className="muted">Edits after completion return this record to draft. Primary answer changes reset the override; its reason is optional.</p>
    </>}
  </section>;
});
