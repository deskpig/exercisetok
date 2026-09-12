import type { RubricField } from './types';

export const secondaryFields: RubricField[] = [
  { id: 'treatment_role', label: 'Adjunct vs monotherapy — accuracy', type: 'domain', section: 'secondary',
    description: 'Draft v2.5, p.3 target. Reference stated on p.1: monotherapy for mild depression; adjunctive therapy for moderate depression. This separate secondary rating is not a sixth primary domain. Also record any contradiction in primary safety or overall conflict.' },
  { id: 'treatment_role_framing', label: 'Treatment role stated', type: 'single', section: 'secondary',
    options: ['Not mentioned', 'Monotherapy', 'Adjunctive therapy', 'Both / severity-dependent', 'Unclear'] },
  { id: 'treatment_role_notes', label: 'Treatment role — quotation / context', type: 'text', section: 'secondary' },
  { id: 'creator_type', label: 'Creator type (exploratory)', type: 'single', section: 'secondary',
    options: ['Health professional', 'Fitness professional', 'Personal / nonprofessional account', 'Organization / media', 'Other', 'Unclear'],
    description: 'Use stated credentials or account description; do not infer from appearance. Suggested categories, not a prespecified codebook in the paper.' },
  { id: 'personal_experience', label: 'Personal experience / testimonial (exploratory)', type: 'single', section: 'secondary', options: ['Present', 'Absent', 'Unclear'] },
  { id: 'evidence_citation', label: 'Evidence citation (exploratory)', type: 'single', section: 'secondary',
    options: ['Identifiable source cited', 'Vague evidence claim only', 'No citation', 'Unclear'] },
  { id: 'citation_notes', label: 'Citation details / other content features', type: 'text', section: 'secondary' },
  ...['views', 'likes', 'comments', 'shares'].map(id => ({
    id, label: id[0].toUpperCase() + id.slice(1) + ' at collection (exploratory)',
    type: 'number' as const, min: 0, section: 'secondary' as const
  })),
  { id: 'engagement_notes', label: 'Engagement display / timing notes', type: 'text', section: 'secondary',
    description: 'Enter counts manually. Leave unavailable values blank; zero means a displayed zero. Note abbreviated displays (e.g. 1.2K), approximations, and timing here. Platform metrics may not be comparable.' }
];
