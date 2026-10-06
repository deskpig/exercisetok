import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Congruence, Evaluation, MediaSnapshot, StudySession } from '../domain/types';
import { evaluationId, newEvaluation, updateEvaluation } from '../domain/evaluation';
import { answerErrors } from '../domain/classification';
import { repository } from '../storage/repository';
import { RubricForm } from './RubricForm';
import { SectionHeader } from './SectionHeader';
import { Icon } from './Icon';

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
  const loading = useRef<Promise<void>>(Promise.resolve());
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
      await loading.current;
      if (!current.current) throw new Error('Wait for the saved answers to load.');
      let pendingSave: Promise<void>;
      do { pendingSave = tail.current; await pendingSave; } while (pendingSave !== tail.current);
    }
  }));
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const task = repository.evaluation(evaluationId(session, media)).then(saved => {
      if (cancelled) return;
      const next = saved ?? newEvaluation(session, media);
      current.current = next; setRow(next); setMessage(saved ? 'Saved answers restored' : 'New draft');
      if (!saved) persist(next);
    });
    loading.current = task;
    void task.catch(() => { if (!cancelled) setError('Could not load this evaluation. Reopen the session to retry.'); });
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
  const builtIn = rubric.id === 'exercise-depression';
  return <section className="evaluation-editor" aria-label="Coding rubric">
    <SectionHeader eyebrow={builtIn ? 'Clinical review / CANMAT' : 'Research review / Custom rubric'}
      title={builtIn ? 'Assess guideline alignment' : rubric.name}
      description={builtIn ? 'Review the message against CANMAT guidelines. Note any conflicts and cite the evidence for your assessment.' : 'Review this post using your study criteria. Record your assessment and supporting notes.'}>
      <div className="editor-meta">
        {rubric.fields.some(field => field.required) && <span className="required-note"><span className="required-mark">*</span> Required fields</span>}
        <span className="save-state" role="status" data-state={pending ? 'pending' : 'saved'}>{pending ? 'Saving…' : message}</span>
      </div>
    </SectionHeader>
    {error && <p className="error" role="alert">{error}</p>}
    {row && <>
      <div className="card rubric-card">
        {rubric.guidance && <details className="criteria"><summary>Encoding criteria</summary><p>{rubric.guidance}</p></details>}
        {rubric.fields.some(field => field.type === 'domain') && <p className="muted domain-hint">Domains default to absent. Accuracy choices mean present.</p>}
        <RubricForm rubric={rubric} values={row.ratings} onChange={answer} />
      </div>
      {row.classification && <section className="classification" aria-label="Global encoding">
        <div className="row"><h3>Global encoding</h3><span className="status-pill" data-classification={row.classification.final ?? 'unclassified'}>{row.classification.final ?? 'Not classified'}</span></div>
        <p className="muted">Inclusion: {row.classification.eligibility} · Automatic: {row.classification.suggested ?? 'Not classified'}</p>
        <details><summary>Why this classification?</summary><p>{row.classification.reason}</p></details>
        <div className="field"><label htmlFor="override">Reviewer override</label><select id="override" disabled={row.classification.eligibility !== 'included'} value={row.classification.override ?? ''} onChange={e => edit({}, (e.target.value || null) as Congruence | null)}>
          <option value="">Use automatic classification</option><option value="congruent">Congruent</option><option value="incongruent">Incongruent</option><option value="partially congruent">Partially congruent</option>
        </select></div>
        {row.classification.override && <div className="field"><label htmlFor="override-reason">Override reason (optional)</label><textarea id="override-reason" value={row.classification.overrideReason} onChange={e => edit({}, undefined, e.target.value)} /></div>}
      </section>}
      <div className="card record-notes">
        <div className="record-notes-fields">
          <details className="field"><summary>Notes / supporting quotations</summary><textarea aria-label="Notes / supporting quotations" value={row.notes} onChange={e => edit({ notes: e.target.value })} /></details>
          <label className="check-label"><input type="checkbox" checked={row.availability === 'unavailable'} onChange={e => edit({ availability: e.target.checked ? 'unavailable' : 'not-checked' })} />Video unavailable / cannot assess</label>
        </div>
        <div className="actions editor-actions">
        <button disabled={pending} onClick={() => { void saveComplete(); }}><Icon name="check" />{onComplete ? 'Complete & next' : 'Save complete'}</button>
        <button className="secondary" onClick={() => edit({})}>Save draft</button>
        </div>
        <p className="muted editor-footnote">Edits after completion return this record to draft. Primary answer changes reset the override; its reason is optional.</p>
      </div>
    </>}
  </section>;
});
