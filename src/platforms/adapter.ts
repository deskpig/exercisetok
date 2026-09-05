import type { MediaSnapshot, Platform } from '../domain/types';

export interface PlatformAdapter {
  readonly platform: Platform;
  matches(url: URL): boolean;
  readActiveMedia(document: Document, url: URL): MediaSnapshot | null;
  observe(onChange: () => void): () => void;
}
