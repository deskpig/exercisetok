export type Platform = 'tiktok' | 'reddit';
export type FieldType = 'single' | 'multi' | 'boolean' | 'number' | 'text' | 'domain';

export interface RubricField {
  id: string;
  label: string;
  description?: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  section?: 'primary' | 'secondary';
}

export interface Rubric {
  id: string; name: string; version: number; fields: RubricField[];
  guidance?: string;
  secondaryGuidance?: string;
  classification?: {
    inclusionFields: string[]; domainFields: string[]; conflictFields: string[];
    actionableField: string; accurateThreshold: number;
  };
}
export type Congruence = 'incongruent' | 'congruent' | 'partially congruent';
export interface Classification {
  eligibility: 'pending' | 'included' | 'excluded';
  suggested: Congruence | null; reason: string; final: Congruence | null;
  override: Congruence | null; overrideReason: string;
}

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
  rubricSnapshot?: Rubric;
  classification?: Classification;
  sessionId?: string;
  availability?: 'available' | 'unavailable' | 'not-checked';
}

export interface StudySession {
  id: string;
  mode: 'browse' | 'review';
  rubric: Rubric;
  queue: MediaSnapshot[];
  index: number;
  createdAt: string;
}

export type ExtensionMessage =
  | { type: 'ACTIVE_MEDIA_REQUEST' }
  | { type: 'ACTIVE_MEDIA_RESPONSE'; media: MediaSnapshot | null }
  | { type: 'MEDIA_CHANGED'; media: MediaSnapshot | null };
