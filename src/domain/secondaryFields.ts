import type { RubricField } from './types';

export const engagementBands = ['Not recorded', '0', '1–9', '10–99', '100–999', '1,000–9,999', '10,000–99,999', '100,000–999,999', '1,000,000–9,999,999', '10,000,000–99,999,999', '100,000,000+'];

export const secondaryFields: RubricField[] = [
  { id: 'treatment_role', label: 'Adjunct vs monotherapy — accuracy', type: 'domain', section: 'secondary',
    description: 'Draft v2.5, p.3 target. Reference stated on p.1: monotherapy for mild depression; adjunctive therapy for moderate depression. This separate secondary rating is not a sixth primary domain. Also record any contradiction in primary safety or overall conflict.' },
  { id: 'treatment_role_framing', label: 'Treatment role stated', type: 'single', section: 'secondary',
    options: ['Not mentioned', 'Monotherapy', 'Adjunctive therapy', 'Both / severity-dependent', 'Unclear'] },
  { id: 'creator_type', label: 'Creator type (exploratory)', type: 'single', section: 'secondary',
    options: ['Health professional', 'Fitness professional', 'Personal / nonprofessional account', 'Organization / media', 'Other', 'Unclear'],
    description: 'Use stated credentials or account description; do not infer from appearance. Suggested categories, not a prespecified codebook in the paper.' },
  { id: 'personal_experience', label: 'Personal experience / testimonial (exploratory)', type: 'single', section: 'secondary', options: ['Present', 'Absent', 'Unclear'] },
  { id: 'evidence_citation', label: 'Evidence citation (exploratory)', type: 'single', section: 'secondary',
    options: ['Identifiable source cited', 'Vague evidence claim only', 'No citation', 'Unclear'] },
  ...['views', 'comments'].map(id => ({
    id: id + '_range', label: id[0].toUpperCase() + id.slice(1) + ' at collection',
    type: 'range' as const, options: engagementBands, default: 'Not recorded', section: 'secondary' as const,
    ...(id === 'views' ? { intro: 'Choose a count band; leave unavailable counts as Not recorded. Note approximations or collection timing in the notes box below.' } : {})
  })),
  { id: 'secondary_notes', label: 'Secondary analysis notes', type: 'text', section: 'secondary' }
];
