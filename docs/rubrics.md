# Custom research rubrics

The form and classifier are independent of the TikTok adapter. Upload JSON through the panel or review page; uploaded files are data, never executable code.

Required root properties: id (stable study ID), name, positive integer version, and a nonempty fields array. Optional guidance is displayed in the panel's encoding-criteria box.

Each field has a unique id, label, and type. Optional properties: description (criteria beside the field), required, options for choice fields, and numeric min/max.

Types: boolean, single, multi, number, text, domain. A domain shows a presence dropdown followed by an accuracy dropdown when present. Stored domain values are absent, accurate, inaccurate, or partial; present is an unfinished draft value requiring characterization.

## Automatic classification

The optional classification configuration references field IDs:

```json
{
  "inclusionFields": ["depression", "exercise", "relationship"],
  "domainFields": ["dose", "intensity", "duration", "indication", "safety"],
  "conflictFields": ["conflict", "false_claim"],
  "actionableField": "actionable",
  "accurateThreshold": 3
}
```

References must resolve to boolean fields, except domainFields, which must resolve to domain fields. All referenced fields are required to finish an included evaluation. Omit classification for a general questionnaire with no automatic congruence coding. Researchers can change wording, domains, references and threshold; a different decision algorithm requires changing src/domain/classification.ts.

Decision order:

1. Any false inclusion criterion: excluded, no congruence label. Complete all screening answers to save as complete; domains are not required for excluded records.
2. Unanswered screening: pending.
3. Any inaccurate domain or true conflict flag: incongruent. This takes precedence over counts and the actionable-guidance exception.
4. Otherwise wait until all domains, conflict flags, and actionable judgment are answered.
5. At least accurateThreshold accurate domains OR true actionable-guidance judgment: congruent.
6. Otherwise: partially congruent.

Three accurate domains plus one partial domain qualify as congruent unless there is an incongruence condition. Partial domains do not count as accurate. A reviewer may override an included record's classification with a reason. Changing an answer clears the override for reconsideration. Both automatic and final values are saved.

## Versions and storage

Increment version when changing a rubric under the same ID. A same-ID/same-version replacement with different contents is rejected against the currently active rubric. Use a different ID for a different study. Each new evaluation preserves rubricSnapshot; older records without snapshots remain readable.

The built-in **Choose exercise/depression rubric** button applies immediately without a file upload or second Apply click. It automatically increases the version when replacing different criteria under the same study ID. Reapplying unchanged criteria does not repeatedly increase the version. JSON object key order is ignored when comparing definitions.

Rubric settings are shared across this extension installation. Data stays in Chrome local storage until exported; there is no cross-researcher sync or independent review import yet. Repeated saves within the current form update its record; reopening a video starts a new record. Save before scrolling: changing the detected video clears unsaved answers.

## Code map

- src/domain/defaultRubric.ts: study-provided exercise/depression criteria.
- src/domain/rubric.ts: uploaded JSON validation.
- src/domain/classification.ts: classification and answer validation.
- src/shared/RubricForm.tsx: generic fields.
- src/shared/RubricUpload.tsx: file validation, preview, application, and download.
- src/panel/main.tsx: form state, suggestion, override, and saving.
- src/domain/export.ts: CSV with classification and rubric provenance.
