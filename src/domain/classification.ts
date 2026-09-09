import type { Classification, Evaluation, Rubric } from './types';
export function classify(rubric: Rubric, ratings: Evaluation['ratings']): Classification {
  const result: Classification = { eligibility: 'pending', suggested: null, final: null, override: null, overrideReason: '', reason: 'Complete the inclusion criteria.' };
  const c = rubric.classification;
  if (!c) return { ...result, reason: 'This rubric has no automatic classification rules.' };
  if (c.inclusionFields.some(id => ratings[id] === false)) return { ...result, eligibility: 'excluded', reason: 'One or more inclusion criteria are absent.' };
  if (c.inclusionFields.some(id => ratings[id] !== true)) return result;
  result.eligibility = 'included';
  const assign = (suggested: Classification['suggested'], reason: string) => ({ ...result, suggested, final: suggested, reason });
  if (c.conflictFields.some(id => ratings[id] === true) || c.domainFields.some(id => ratings[id] === 'inaccurate')) return assign('incongruent', 'An inaccurate domain, guideline conflict, or extraneous false claim was recorded.');
  if (c.domainFields.some(id => !['absent','accurate','inaccurate','partial'].includes(String(ratings[id]))) || [...c.conflictFields, c.actionableField].some(id => typeof ratings[id] !== 'boolean')) return assign(null, 'Complete domain characterizations and overall-message questions.');
  const count = c.domainFields.filter(id => ratings[id] === 'accurate').length;
  if (ratings[c.actionableField] === true) return assign('congruent', 'Reviewer recorded actionable guidance consistent with the guidelines.');
  if (count >= c.accurateThreshold) return assign('congruent', count + ' domains are characterized accurately.');
  return assign('partially congruent', count + ' accurate domains; no incongruence condition or actionable-guidance exception recorded.');
}
export function answerErrors(rubric: Rubric, ratings: Evaluation['ratings']): string[] {
  const excluded = classify(rubric, ratings).eligibility === 'excluded';
  return rubric.fields.flatMap(f => {
    const v = ratings[f.id];
    if (excluded && !rubric.classification?.inclusionFields.includes(f.id)) return [];
    const c = rubric.classification;
    const required = f.required || (c && [...c.inclusionFields, ...c.domainFields, ...c.conflictFields, c.actionableField].includes(f.id));
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) return required ? ['Answer: ' + f.label] : [];
    const valid = f.type === 'boolean' ? typeof v === 'boolean' : f.type === 'domain' ? ['absent','accurate','inaccurate','partial'].includes(String(v)) : f.type === 'number' ? typeof v === 'number' && Number.isFinite(v) && (f.min === undefined || v >= f.min) && (f.max === undefined || v <= f.max) : f.type === 'single' ? f.options?.includes(String(v)) : f.type === 'multi' ? Array.isArray(v) && v.every(x => f.options?.includes(x)) : typeof v === 'string';
    return valid ? [] : ['Check: ' + f.label];
  });
}
