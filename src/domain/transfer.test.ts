import { describe, expect, it } from 'vitest';
import { analysisRows, blindList, parseTikTokUrl, parseVideoList } from './transfer';
import { newEvaluation, updateEvaluation } from './evaluation';
import { defaultRubric } from './defaultRubric';
import type { StudySession } from './types';
import { toCsv } from './export';
const url = 'https://www.tiktok.com/@example/video/123456789';
const media = parseTikTokUrl(url);
const session: StudySession = { id:'session-a', mode:'browse', rubric:defaultRubric, queue:[media], index:0, createdAt:'2026-09-12T00:00:00Z' };

describe('list validation and blinding', () => {
  it('round-trips a blinded export without researcher data', () => {
    const row = { ...newEvaluation(session, media), raterId:'SECRET_RATER', notes:'SECRET_NOTE', ratings:{ private:'SECRET_RATING' } };
    const data = blindList([row]);
    expect(Object.keys(data)).toEqual(['kind','schemaVersion','videos']);
    expect(Object.keys(data.videos[0])).toEqual(['platform','externalId','url']);
    const text = JSON.stringify(data);
    expect(text).not.toContain('SECRET');
    expect(text).not.toContain('session');
    expect(text).not.toContain('createdAt');
    expect(parseVideoList(text).videos[0].externalId).toBe(media.externalId);
  });
  it('deduplicates URLs without changing first-seen order', () => {
    const result = parseVideoList(url + '?tracking=secret\n' + url + '\nhttps://www.tiktok.com/@second/video/987654321');
    expect(result.duplicates).toBe(1);
    expect(result.videos.map(v => v.externalId)).toEqual(['123456789','987654321']);
    expect(result.videos[0].canonicalUrl).toBe(url);
  });
  it('accepts a BOM and a JSON array of links', () => expect(parseVideoList('\uFEFF' + JSON.stringify([url])).videos).toHaveLength(1));
  it.each(['', 'https://evil.example/@a/video/123', 'javascript:alert(1)', 'https://www.tiktok.com.evil.example/@a/video/123', 'https://user:pass@www.tiktok.com/@a/video/123', 'https://vm.tiktok.com/short', 'https://www.tiktok.com/@a', 'http://www.tiktok.com/@a/video/123'])('rejects unsafe or unsupported input: %s', value => expect(() => parseVideoList(value)).toThrow());
  it('rejects full ratings exports instead of showing another researcher’s coding', () => expect(() => parseVideoList(JSON.stringify([newEvaluation(session, media)]))).toThrow('blinded list'));
  it('rejects metadata smuggled into a blinded list', () => {
    const data = { ...blindList([newEvaluation(session, media)]), notes:'secret' };
    expect(() => parseVideoList(JSON.stringify(data))).toThrow('without researcher data');
  });
  it('rejects ratings on video entries', () => {
    const data = blindList([newEvaluation(session, media)]);
    expect(() => parseVideoList(JSON.stringify({ ...data, videos:[{ ...data.videos[0], ratings:{} }] }))).toThrow('without ratings');
  });
  it('rejects mismatched IDs and invalid JSON with useful errors', () => {
    const data = blindList([newEvaluation(session, media)]);
    data.videos[0].externalId = 'wrong';
    expect(() => parseVideoList(JSON.stringify(data))).toThrow('do not match');
    expect(() => parseVideoList('{broken')).toThrow('valid JSON');
  });
});
describe('independent evaluations and analysis export', () => {
  it('uses the same record on revisit and a fresh ID for another researcher’s session', () => {
    expect(newEvaluation(session, media).id).toBe(newEvaluation(session, media).id);
    expect(newEvaluation({ ...session, id:'reviewer-b', mode:'review' }, media).id).not.toBe(newEvaluation(session, media).id);
  });
  it('allows overrides with no reason and preserves primary suggestion', () => {
    const row = newEvaluation(session, media);
    const next = updateEvaluation(row, { ratings:{ ...row.ratings, exercise_depression:true } }, 'congruent', '');
    expect(next.classification).toMatchObject({ suggested:'partially congruent', final:'congruent', overrideReason:'' });
    expect(updateEvaluation(next, { notes:'secondary note' }).classification?.override).toBe('congruent');
  });
  it('does not count the secondary treatment-role rating as a sixth primary domain', () => {
    const row = newEvaluation(session, media);
    const next = updateEvaluation(row, { ratings:{ ...row.ratings, exercise_depression:true, dose:'accurate', intensity:'accurate', treatment_role:'accurate' } });
    expect(next.classification?.suggested).toBe('partially congruent');
  });
  it('requires a rater ID only at analysis export and does not mutate saved records', () => {
    const row = newEvaluation(session, media);
    expect(() => analysisRows([row], ' ')).toThrow('unique rater ID');
    const output = analysisRows([row], ' R02 ');
    expect(output[0].raterId).toBe('R02');
    expect(row.raterId).toBe('');
  });
  it('exports field columns, explicit zero and false, blank unavailable data, and formula-safe notes', () => {
    const row = { ...newEvaluation(session, media), notes:'=1+1', ratings:{ dose:'absent', exercise_depression:false, views:0 } };
    const csv = toCsv(analysisRows([row], 'R02'));
    expect(csv).toContain('rating.treatment_role');
    expect(csv).toContain('rating.views');
    expect(csv).toContain('"false"');
    expect(csv).toContain('"0"');
    expect(csv).toContain('"' + "'=1+1" + '"');
  });
});
