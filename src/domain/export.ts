import type { Evaluation } from './types';
export function toCsv(rows: Evaluation[]): string {
  const headers = ['id','platform','url','externalId','author','raterId','status','rubricId','rubricVersion','eligibility','automatic','automaticReason','final','override','overrideReason','ratings','notes','rubricSnapshot','observedAt','createdAt','updatedAt'];
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
    r.media.observedAt, r.createdAt, r.updatedAt
  ].map(quote).join(','))].join('\n');
}
