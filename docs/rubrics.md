# Custom research rubrics

Choose a rubric after selecting browse mode or uploading a TikTok list. The built-in **Use exercise for depression rubric** button starts immediately without an upload. **Upload custom rubric** opens the guide and a **Choose JSON file** button together. A selected file is validated, previewed, then chosen with **Use uploaded rubric**. **Close instructions** hides the guide and upload controls.

## Minimal JSON schema

Upload a UTF-8 `.json` file, up to 1 MB. Only a nonempty `fields` array is required. Each field needs a display name under `field`; omitting `field-type` makes it free text.

```json
{
  "fields": [
    {
      "field": "Exercise mentioned",
      "field-type": "options",
      "field-values": ["Absent", "Present"],
      "field-default": "Absent"
    },
    {
      "field": "Confidence",
      "field-type": "range",
      "field-values": { "min": 0, "max": 10, "step": 1 },
      "field-default": 5
    },
    { "field": "Notes" }
  ]
}
```

The upload guide has two code blocks: the overall file structure with a placeholder for fields, and a field example that changes when you click a type. Range examples switch between numeric scales and labeled bands. **Copy example JSON** and **Download this example** produce a complete valid file, replacing the placeholder.

| `field-type` | `field-values` | Control / saved answer |
| --- | --- | --- |
| `options` | Array of distinct text choices, such as `["Absent", "Present"]`. | Radios; saves the selected string. |
| `range` | Numeric bounds, e.g. `{"min": 0, "max": 10, "step": 1}`, or an ordered array of labels. | Slider; saves a number for a numeric scale or the selected label for bands. |
| `custom-string` | Omit; any text is allowed. | Text area; saves text. |
| `custom-number` | Omit, or supply numeric `min`, `max`, and/or `step`. | Number input; saves a number. |

`field-default` is optional and must match the field type, options, and bounds. Numeric ranges default to their minimum; labeled ranges default to their first label. Numeric ranges without bounds use 0–100 with a step of 1. Other compact fields start blank unless a default is supplied. Put a “Not recorded” label first when an untouched band slider should mean missing data.

The rubric's `name`, `id`, and `version` are optional. The extension generates field IDs and a repeatable rubric ID, uses “Custom rubric” when no name is supplied, and defaults the version to 1. A bare array of field items is also accepted. Fields are optional to complete unless marked `required: true` or referenced by classification rules.

Use the same file across researchers when you want matching definitions. To manage revisions under one study ID, supply an explicit `id` and increment `version` when changing the definition.

## Existing / advanced schemas

The previous format with `id`, `label`, and `type` per field still works, including `domain`, `boolean`, `single`, `multi`, `number`, and `text`. The new `range` type accepts ordered text `options` or numeric `min`/`max`/`step`. Advanced fields can use `default`; boolean labels can use `booleanLabels: ["False", "True"]` (false label first).

Optional properties include `description`, `intro` (visible guidance before the field), `required`, and `section` (`primary` or `secondary`). Secondary fields are collapsed together; their notes boxes appear directly when the section is expanded. Optional root properties include `guidance`, `secondaryGuidance`, and `classification`.

Explicit field IDs must be unique, start with a letter, and use letters, numbers, underscores, or hyphens; prototype-related keys are rejected. Choice fields need distinct text options. Defaults, numeric bounds, step sizes, and classification references are validated before a rubric can be chosen.

The upload is normalized to one internal schema, which is preserved in the session and each evaluation. Uploaded JSON is data, never executable code. Defaults are saved, not just displayed. Domains default to `absent` and booleans to `false`, unless an explicit valid default overrides them. The legacy domain value `present` remains an unfinished draft value requiring characterization.

## Upload errors

Errors name the selected file and distinguish:

- Unsupported file extension: choose a `.json` text file; `.JSON` is also accepted.
- File too large: the message shows its size and the 1 MB limit.
- File access failure or an empty document.
- JSON syntax: line and column, a short explanation, and an excerpt with a pointer to the error. Missing punctuation, comments, trailing commas, and copied `...` placeholders are rejected with specific guidance; malformed JSON is never silently repaired.
- Rubric structure: syntactically valid JSON is checked separately, with the invalid setting reported (for example a missing fields array or an invalid field default).

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

## Built-in exercise/depression rubric, version 5

The primary rules and clinical wording are supplied by the research team. One combined Absent/Present control covers mention of exercise, depression, and a relationship between them. An untouched form is excluded until inclusion is marked Present. Safety remains one primary domain spanning the supplied disclaimers. The overall CANMAT-conflict control uses False/True and defaults to False. The actionable-guidance label is shortened without changing classification behavior. Long encoding/secondary introductions are omitted from the panel; individual field criteria remain available.

Secondary analysis is based on the attached *Living ExcerciseTok Draft – v2.5*, particularly its secondary objectives on page 3:

| Target | Data captured |
| --- | --- |
| Domain omissions and inaccuracies | The primary dose, intensity, duration, and indication ratings already distinguish absent, accurate, inaccurate, and partial. |
| Adjunct vs monotherapy | Separate `treatment_role` accuracy rating, stated treatment framing, and context in the shared secondary notes box. |
| Platform differences | The `media.platform` field and CSV `platform` column are preserved. TikTok is currently implemented; Reddit collection still needs an adapter and viewer. |
| Content features associated with congruence | Optional exploratory creator type, testimonial, source citation, views/comments count bands, and notes. |

The paper does **not** prescribe a detailed content-feature codebook. The exploratory categories are starting points for the study's finalized definitions. Views and comments use sliders; likes and shares have been removed since version 4. Version 5 provides one **Secondary analysis notes** box (`secondary_notes`) for treatment context, citations, other content features, count approximations, and timing. The count guidance is visible immediately before the views/comments sliders. Older sessions keep their separate notes fields; no saved text is deleted or rewritten.

Count bands are **Not recorded**, **0**, **1–9**, **10–99**, **100–999**, **1,000–9,999**, **10,000–99,999**, **100,000–999,999**, **1,000,000–9,999,999**, **10,000,000–99,999,999**, and **100,000,000+**. Missing counts default to Not recorded. Stored values use new `views_range` and `comments_range` IDs so they cannot be mistaken for the exact numeric values in earlier versions.

The secondary treatment-role description uses the draft's stated mild/monotherapy and moderate/adjunctive distinction. It is **not** a sixth domain in the primary score. If a treatment-role statement also contradicts primary safety or the overall guideline message, code the relevant primary field too. Secondary fields alone do not change the built-in global classification.

## Sessions and compatibility

The selected rubric is fixed within a session, and each evaluation includes its `rubricSnapshot`. Start a new session to choose different criteria; use a new ID for a different study and increment versions for changes. Choosing the built-in rubric in a new session always uses the shipped definition without asking you to increment anything.

Old records and their original definitions remain readable and exportable. New sessions do not rewrite old answers. Defaults apply to newly created evaluations; missing legacy/custom fields are not retroactively filled. Each session/video pair has a stable evaluation ID, so revisiting restores that session's answers. A new imported-list session starts fresh independent ratings.

The editor autosaves changes, waits for pending saves before navigating or exporting, and reports failed saves without clearing the current form. Completion checks required fields and classifier inputs. Mark an inaccessible video unavailable and continue; it stays a draft and can be included in exports.

## Code map

- `src/domain/defaultRubric.ts`, `secondaryFields.ts`: built-in study definitions.
- `src/domain/rubricImport.ts`, `rubric.ts`, `fieldValue.ts`: minimal/advanced upload normalization and validation.
- `src/domain/rubricFile.ts`: file checks and JSON syntax diagnostics with line/column locations.
- `src/domain/classification.ts`: automatic classification and answer validation.
- `src/domain/evaluation.ts`: stable record identity and default/updated evaluations.
- `src/shared/RubricChoice.tsx`, `RubricInstructions.tsx`: choice, two-block interactive examples, download, and preview.
- `src/shared/RubricForm.tsx`: generic controls and secondary grouping.
- `src/shared/EvaluationEditor.tsx`: autosave, completion, notes, and overrides.
- `src/domain/transfer.ts`, `export.ts`: blinded files and analysis exports.
