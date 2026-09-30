export const fieldExamples = {
  options: { field: 'Exercise mentioned', 'field-type': 'options', 'field-values': ['Absent', 'Present'], 'field-default': 'Absent' },
  range: { field: 'Confidence', 'field-type': 'range', 'field-values': { min: 0, max: 10, step: 1 }, 'field-default': 5 },
  'custom-string': { field: 'Notes', 'field-type': 'custom-string', 'field-default': '' },
  'custom-number': { field: 'Number of sessions', 'field-type': 'custom-number', 'field-values': { min: 0 }, 'field-default': 0 }
};
export const bandExample = { field: 'View count', 'field-type': 'range', 'field-values': ['Not recorded', '0', '1–99', '100–9,999', '10,000+'], 'field-default': 'Not recorded' };
