import type { Rubric } from './types';
import { secondaryFields } from './secondaryFields';
export const defaultRubric: Rubric = {
  id: 'exercise-depression', name: 'Exercise and depression — study coding criteria', version: 5,
  fields: [
    { id: 'exercise_depression', label: 'Exercise and depression mentioned together', type: 'boolean', required: true, description: 'Present when both are mentioned and a relationship between them is made. This single check covers all three inclusion criteria.' },
    { id: 'dose', label: 'Frequency / time (dose)', type: 'domain', required: true, description: '30–40 minutes, 3–4 times per week, or a summative equivalent within 90–160 minutes per week.' },
    { id: 'intensity', label: 'Intensity', type: 'domain', required: true, description: 'Low–moderate intensity.' },
    { id: 'duration', label: 'Duration', type: 'domain', required: true, description: '9 weeks or more.' },
    { id: 'indication', label: 'Indication', type: 'domain', required: true, description: 'Mild or moderate depression.' },
    { id: 'safety', label: 'Safety', type: 'domain', required: true, description: 'Exercise does not exclude other treatments; is not framed as sufficient treatment in inappropriate circumstances (severe depression, all depression, or psychiatric emergencies such as suicidal ideation in depression); supervision is recommended. Rate these together as one safety domain.' },
    { id: 'conflict', label: 'Overall message conflicts with CANMAT guidelines', type: 'boolean', required: true, booleanLabels: ['False', 'True'] },
    { id: 'false_claim', label: 'Extraneous false (not evidence-based) claim is made', type: 'boolean', required: true },
    { id: 'claim_notes', label: 'Claim / guideline conflict evidence and notes', type: 'text' },
    { id: 'actionable', label: 'Guidance is overall actionable and guideline-congruent', type: 'boolean', description: 'No contradictions to CANMAT; a consumer could reasonably understand how to act, and acting on the guidance would reasonably result in adherence. Permits congruent coding with fewer than 3 accurate domains unless an incongruence condition is recorded.' },
    ...secondaryFields
  ],
  classification: { inclusionFields: ['exercise_depression'], domainFields: ['dose', 'intensity', 'duration', 'indication', 'safety'], conflictFields: ['conflict', 'false_claim'], actionableField: 'actionable', accurateThreshold: 3 }
};
