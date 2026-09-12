import type { Congruence, Evaluation, MediaSnapshot, StudySession } from './types';
import { classify } from './classification';
import { defaultAnswers } from './defaultAnswers';

export function evaluationId(session: StudySession, media: MediaSnapshot) {
  return session.id + ':' + media.platform + ':' + media.externalId;
}
export function newEvaluation(session: StudySession, media: MediaSnapshot): Evaluation {
  const now = new Date().toISOString();
  const ratings = defaultAnswers(session.rubric);
  return { id: evaluationId(session, media), sessionId: session.id, media,
    rubricId: session.rubric.id, rubricVersion: session.rubric.version, rubricSnapshot: session.rubric,
    raterId: '', ratings, notes: '', status: 'draft', availability: 'not-checked', createdAt: now, updatedAt: now,
    classification: session.rubric.classification ? classify(session.rubric, ratings) : undefined };
}
export function updateEvaluation(row: Evaluation, changes: Partial<Pick<Evaluation, 'ratings' | 'notes' | 'status' | 'availability'>>, override?: Congruence | null, reason?: string): Evaluation {
  const next = { ...row, ...changes, updatedAt: new Date().toISOString() };
  const rubric = next.rubricSnapshot;
  if (!rubric?.classification) return next;
  const auto = classify(rubric, next.ratings);
  const choice = override === undefined ? row.classification?.override ?? null : override;
  next.classification = { ...auto, override: auto.eligibility === 'included' ? choice : null,
    final: auto.eligibility === 'included' ? choice || auto.suggested : null,
    overrideReason: auto.eligibility === 'included' ? reason ?? row.classification?.overrideReason ?? '' : '' };
  return next;
}
