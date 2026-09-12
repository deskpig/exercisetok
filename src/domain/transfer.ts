import type { Evaluation, MediaSnapshot } from './types';

export interface BlindList {
  kind: 'exercisetok-blind-list';
  schemaVersion: 1;
  videos: { platform: 'tiktok'; externalId: string; url: string }[];
}

export function parseTikTokUrl(value: unknown, observedAt = new Date().toISOString()): MediaSnapshot {
  if (typeof value !== 'string') throw new Error('Each item needs a TikTok video URL.');
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('Invalid TikTok URL.'); }
  if (url.protocol !== 'https:' || !['www.tiktok.com', 'tiktok.com', 'm.tiktok.com'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('Use a full https://www.tiktok.com/@creator/video/ID link.');
  const match = url.pathname.match(/^\/@([a-zA-Z0-9._-]+)\/video\/(\d+)\/?$/);
  if (!match) throw new Error('Open the video and copy its full /@creator/video/ID link; short links and profile URLs are not supported.');
  return { platform: 'tiktok', externalId: match[2], author: match[1], canonicalUrl: 'https://www.tiktok.com/@' + match[1] + '/video/' + match[2], observedAt };
}

export function parseVideoList(text: string): { videos: MediaSnapshot[]; duplicates: number } {
  if (text.length > 2_000_000) throw new Error('List must be smaller than 2 MB.');
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) throw new Error('The list is empty.');
  let entries: unknown[];
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let value;
    try { value = JSON.parse(trimmed); } catch { throw new Error('List is not valid JSON.'); }
    if (Array.isArray(value) && value.every(item => typeof item === 'string')) entries = value;
    else if (value?.kind === 'exercisetok-blind-list' && value.schemaVersion === 1 && Array.isArray(value.videos)) {
      if (Object.keys(value).some(key => !['kind','schemaVersion','videos'].includes(key))) throw new Error('Use a blinded list export, without researcher data.');
      entries = value.videos.map((item: unknown) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid video entry.');
        const row = item as Record<string, unknown>;
        if (Object.keys(row).some(key => !['platform','externalId','url'].includes(key)) || row.platform !== 'tiktok') throw new Error('Blinded lists must contain TikTok links only, without ratings or notes.');
        const media = parseTikTokUrl(row.url);
        if (row.externalId !== media.externalId) throw new Error('Video ID and URL do not match.');
        return media.canonicalUrl;
      });
    } else throw new Error('Upload a blinded list, not a full analysis export. Plain text with one video URL per line also works.');
  } else entries = trimmed.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!entries.length || entries.length > 5000) throw new Error('Provide between 1 and 5,000 videos.');
  const seen = new Set<string>();
  const videos: MediaSnapshot[] = [];
  let duplicates = 0;
  entries.forEach((entry, index) => {
    let media;
    try { media = parseTikTokUrl(entry); } catch (error) { throw new Error('Item ' + (index + 1) + ': ' + (error as Error).message); }
    if (seen.has(media.externalId)) duplicates++;
    else { seen.add(media.externalId); videos.push(media); }
  });
  return { videos, duplicates };
}

export function blindList(rows: Evaluation[]): BlindList {
  const videos: BlindList['videos'] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const media = parseTikTokUrl(row.media.canonicalUrl);
    if (seen.has(media.externalId)) continue;
    seen.add(media.externalId);
    videos.push({ platform: 'tiktok', externalId: media.externalId, url: media.canonicalUrl });
  }
  return { kind: 'exercisetok-blind-list', schemaVersion: 1, videos };
}

export function analysisRows(rows: Evaluation[], raterId: string): Evaluation[] {
  if (!raterId.trim()) throw new Error('Enter your unique rater ID before exporting analysis data.');
  return rows.map(row => ({ ...row, raterId: raterId.trim() }));
}
