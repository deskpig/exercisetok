import type { Evaluation } from './types';
export function toCsv(rows: Evaluation[]): string {
  const fieldIds = [...new Set(rows.flatMap(row => [...Object.keys(row.ratings), ...(row.rubricSnapshot?.fields.map(field => field.id) ?? [])]))].sort();
  const headers = ['id','platform','url','externalId','author','raterId','status','rubricId','rubricVersion','eligibility','automatic','automaticReason','final','override','overrideReason','ratings','notes','rubricSnapshot','observedAt','createdAt','updatedAt','sessionId','availability', ...fieldIds.map(id => 'rating.' + id)];
  const quote = (value: unknown) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return [headers.join(','), ...rows.map(r => [
    r.id, r.media.platform, r.media.canonicalUrl, r.media.externalId, r.media.author, r.raterId, r.status,
    r.rubricId, r.rubricVersion, r.classification?.eligibility, r.classification?.suggested, r.classification?.reason,
    r.classification?.final, r.classification?.override, r.classification?.overrideReason,
    JSON.stringify(r.ratings), r.notes, r.rubricSnapshot ? JSON.stringify(r.rubricSnapshot) : '',
    r.media.observedAt, r.createdAt, r.updatedAt, r.sessionId, r.availability,
    ...fieldIds.map(id => Array.isArray(r.ratings[id]) ? JSON.stringify(r.ratings[id]) : r.ratings[id])
  ].map(quote).join(','))].join('\n');
}
