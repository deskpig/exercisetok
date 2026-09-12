# Custom research rubrics

Choose a rubric after selecting browse mode or uploading a TikTok list. The built-in **Use exercise for depression rubric** button starts immediately without an upload. A custom file is validated, previewed, then chosen with **Use uploaded rubric**. The ⓘ button explains the format and offers a complete example download.

## JSON schema

Upload a UTF-8 `.json` file, up to 1 MB. Required root properties:

- `id`: stable study identifier.
- `name`: displayed rubric name.
- `version`: positive integer; increment it when changing criteria.
- `fields`: nonempty array of field definitions.

Optional root properties: `guidance` (encoding criteria), `secondaryGuidance` (secondary section explanation), and `classification`.

Each field needs a unique `id`, a `label`, and a supported `type`. Field IDs start with a letter and use letters, numbers, underscores, or hyphens; prototype-related keys are rejected. Optional properties are `description`, `required`, `options`, numeric `min`/`max`, and `section` (`primary` or `secondary`). Secondary fields appear in a collapsed group.

| Type | Control and saved value |
| --- | --- |
| `domain` | Radios: `absent`, `accurate`, `inaccurate`, `partial`; defaults to `absent`. Accuracy choices imply presence. |
| `boolean` | Absent/Present radios; saves `false`/`true`, defaults to `false`. |
| `single` | Radios from `options`; saves the chosen string, with no automatic choice. |
| `multi` | Checkboxes from `options`; saves an array of strings. |
| `number` | Numeric input, optionally bounded by `min`/`max`. |
| `text` | Text area; optional text fields expand on demand. |

Example questionnaire without automatic classification:

```json
{
  "id": "custom-project",
  "name": "Example research rubric",
  "version": 1,
  "guidance": "Code only what the video says.",
  "fields": [
    { "id": "topic", "label": "Study topic mentioned", "type": "boolean", "required": true },
    { "id": "claim", "label": "Claim accuracy", "type": "domain", "description": "Replace with your evidence criteria." },
    { "id": "format", "label": "Content format", "type": "single", "options": ["Advice", "Personal experience", "Other"], "section": "secondary" }
  ]
}
```

The extension renders controls from the definitions and stores answers under field IDs. Uploaded JSON is data, never executable code. Defaults are saved, not just displayed. Blank optional values stay blank; zero means an explicitly entered zero. The legacy domain value `present` remains an unfinished draft value requiring characterization.

## Automatic classification

The built-in rubric uses:

```json
{
  "inclusionFields": ["exercise_depression"],
  "domainFields": ["dose", "intensity", "duration", "indication", "safety"],
  "conflictFields": ["conflict", "false_claim"],
  "actionableField": "actionable",
  "accurateThreshold": 3
}
```

Place this object under `classification`. References must resolve to boolean fields, except `domainFields`, which must resolve to domain fields. All classifier inputs must be answered to finish an included evaluation. Omit classification for a general questionnaire. Different decision algorithms require changing `src/domain/classification.ts`.

Decision order:

1. A false inclusion criterion means excluded, with no congruence label. Domains are not required for excluded records.
2. Unanswered screening means pending.
3. Any inaccurate primary domain or true conflict flag means incongruent, taking precedence over counts and the actionable-guidance exception.
4. Otherwise wait for all primary classifier inputs.
5. At least `accurateThreshold` accurate domains, or a true actionable-guidance judgment, means congruent.
6. Otherwise the record is partially congruent.

Partial domains do not count as accurate. Three accurate domains plus a partial domain qualify as congruent unless an incongruence condition is present. A reviewer may override an included record's classification; the reason is optional. Changing a classifier input resets the override for reconsideration. Changes to notes or secondary fields preserve it. Both automatic and final values are exported.

## Built-in exercise/depression rubric, version 3

The primary rules and clinical wording are supplied by the research team. One combined Absent/Present control covers mention of exercise, depression, and a relationship between them. An untouched form is excluded until inclusion is marked Present. Safety remains one primary domain spanning the supplied disclaimers.

Secondary analysis is based on the attached *Living ExcerciseTok Draft – v2.5*, particularly its secondary objectives on page 3:

| Target | Data captured |
| --- | --- |
| Domain omissions and inaccuracies | The primary dose, intensity, duration, and indication ratings already distinguish absent, accurate, inaccurate, and partial. |
| Adjunct vs monotherapy | Separate `treatment_role` accuracy rating, stated treatment framing, and a quotation/context field. |
| Platform differences | The `media.platform` field and CSV `platform` column are preserved. TikTok is currently implemented; Reddit collection still needs an adapter and viewer. |
| Content features associated with congruence | Optional exploratory creator type, testimonial, source citation, engagement counts, and notes. |

The paper does **not** prescribe a detailed content-feature codebook. The exploratory categories are starting points, explicitly labeled as such in the panel, and should be adapted to the study's finalized definitions. Engagement counts are entered manually; leave unavailable counts blank. Citation notes can capture the exact source; engagement notes can record abbreviations, approximations, and timing.

The secondary treatment-role description uses the draft's stated mild/monotherapy and moderate/adjunctive distinction. It is **not** a sixth domain in the primary score. If a treatment-role statement also contradicts primary safety or the overall guideline message, code the relevant primary field too. Secondary fields alone do not change the built-in global classification.

## Sessions and compatibility

The selected rubric is fixed within a session, and each evaluation includes its `rubricSnapshot`. Start a new session to choose different criteria; use a new ID for a different study and increment versions for changes. Choosing the built-in rubric in a new session always uses the shipped definition without asking you to increment anything.

Old records and their original definitions remain readable and exportable. New sessions do not rewrite old answers. Defaults apply to newly created evaluations; missing legacy/custom fields are not retroactively filled. Each session/video pair has a stable evaluation ID, so revisiting restores that session's answers. A new imported-list session starts fresh independent ratings.

The editor autosaves changes, waits for pending saves before navigating or exporting, and reports failed saves without clearing the current form. Completion checks required fields and classifier inputs. Mark an inaccessible video unavailable and continue; it stays a draft and can be included in exports.

## Code map

- `src/domain/defaultRubric.ts`, `secondaryFields.ts`: built-in study definitions.
- `src/domain/rubric.ts`: uploaded JSON validation.
- `src/domain/classification.ts`: automatic classification and answer validation.
- `src/domain/evaluation.ts`: stable record identity and default/updated evaluations.
- `src/shared/RubricChoice.tsx`: rubric choice, help, example download, and preview.
- `src/shared/RubricForm.tsx`: generic controls and secondary grouping.
- `src/shared/EvaluationEditor.tsx`: autosave, completion, notes, and overrides.
- `src/domain/transfer.ts`, `export.ts`: blinded files and analysis exports.
