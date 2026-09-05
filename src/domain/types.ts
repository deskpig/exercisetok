export type Platform = 'tiktok' | 'reddit';
export type FieldType = 'single' | 'multi' | 'boolean' | 'number' | 'text';

export interface RubricField {
  id: string;
  label: string;
  description?: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface Rubric { id: string; name: string; version: number; fields: RubricField[] }

export interface MediaSnapshot {
  platform: Platform;
  canonicalUrl: string;
  externalId: string;
  author?: string;
  caption?: string;
  observedAt: string;
}

export interface Evaluation {
  id: string;
  media: MediaSnapshot;
  rubricId: string;
  rubricVersion: number;
  raterId: string;
  ratings: Record<string, string | string[] | number | boolean>;
  notes: string;
  status: 'draft' | 'complete';
  createdAt: string;
  updatedAt: string;
}

export type ExtensionMessage =
  | { type: 'ACTIVE_MEDIA_REQUEST' }
  | { type: 'ACTIVE_MEDIA_RESPONSE'; media: MediaSnapshot | null }
  | { type: 'MEDIA_CHANGED'; media: MediaSnapshot | null };
