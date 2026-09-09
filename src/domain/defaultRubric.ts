import type { Rubric } from './types';
export const defaultRubric: Rubric = {
  id: 'exercise-depression', name: 'Exercise and depression — study coding criteria', version: 1,
  guidance: 'Study criteria supplied by the research team. Inclusion requires depression, exercise, and a relationship between them. Incongruent: any inaccurate domain, overall conflict with CANMAT, or extraneous false claim (takes precedence). Congruent: at least 3 accurate domains OR reviewer determination that there are no contradictions to CANMAT and guidance is reasonably actionable and would result in adherence. Otherwise included content is partially congruent, including 2 or fewer accurate domains. Partial characterizations do not count as accurate domains. Excluded content receives no congruence class.',
  fields: [
    { id: 'depression', label: 'Depression is mentioned', type: 'boolean', required: true },
    { id: 'exercise', label: 'Exercise is mentioned', type: 'boolean', required: true },
    { id: 'relationship', label: 'A relationship between depression and exercise is made', type: 'boolean', required: true },
    { id: 'dose', label: 'Frequency / time (dose)', type: 'domain', required: true, description: '30–40 minutes, 3–4 times per week, or a summative equivalent within 90–160 minutes per week.' },
    { id: 'intensity', label: 'Intensity', type: 'domain', required: true, description: 'Low–moderate intensity.' },
    { id: 'duration', label: 'Duration', type: 'domain', required: true, description: '9 weeks or more.' },
    { id: 'indication', label: 'Indication', type: 'domain', required: true, description: 'Mild or moderate depression.' },
    { id: 'safety', label: 'Safety', type: 'domain', required: true, description: 'Exercise does not exclude other treatments; is not framed as sufficient treatment in inappropriate circumstances (severe depression, all depression, or psychiatric emergencies such as suicidal ideation in depression); supervision is recommended. Rate these together as one safety domain.' },
    { id: 'conflict', label: 'Overall message conflicts with CANMAT guidelines', type: 'boolean', required: true },
    { id: 'false_claim', label: 'Extraneous false (not evidence-based) claim is made', type: 'boolean', required: true },
    { id: 'claim_notes', label: 'Claim / guideline conflict evidence and notes', type: 'text' },
    { id: 'actionable', label: 'Reviewer determines guidance is actionable and guideline-congruent', type: 'boolean', required: true, description: 'No contradictions to CANMAT; a consumer could reasonably understand how to act, and acting on the guidance would reasonably result in adherence. Permits congruent coding with fewer than 3 accurate domains unless an incongruence condition is recorded.' }
  ],
  classification: { inclusionFields: ['depression', 'exercise', 'relationship'], domainFields: ['dose', 'intensity', 'duration', 'indication', 'safety'], conflictFields: ['conflict', 'false_claim'], actionableField: 'actionable', accurateThreshold: 3 }
};
