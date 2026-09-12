# Handoff and analysis files

Files are downloaded locally from **Export & share**. No recipient, account, or server upload is required.

## Blinded list

`exercisetok-blind-list.json` contains only an envelope and whitelisted video identifiers/links:

```json
{
  "kind": "exercisetok-blind-list",
  "schemaVersion": 1,
  "videos": [
    {
      "platform": "tiktok",
      "externalId": "123456789",
      "url": "https://www.tiktok.com/@example/video/123456789"
    }
  ]
}
```

This is a format illustration; the example video is not a real study sample.

There are no rater IDs, session IDs, ratings, notes, classifications, status, coding timestamps, captions, or rubric definitions. URL query strings/fragments are removed, and duplicate video IDs are exported once in first-seen order. The links still identify the public videos and their creators; blinding hides coding information.

The receiving researcher selects **Upload another researcher’s TikTok list**, then chooses a rubric. Each import creates an independent session, even when videos were previously rated on this installation. Review only shows this session's own ratings.

Also accepted:

- A JSON array of full TikTok URL strings.
- A UTF-8 text file containing one full TikTok video URL per line.

Lists must contain 1–5,000 videos and be at most 2 MB. The parser validates HTTPS TikTok hosts, full `/@creator/video/ID` paths, and ID consistency. It rejects shortened links, malformed data, additional fields in blinded exports, and full analysis exports. Duplicates are removed with a count shown before rubric selection.

## Analysis JSON

`exercisetok-analysis.json` has `kind: "exercisetok-analysis"`, `schemaVersion: 1`, `raterId`, and an `evaluations` array. Each evaluation includes:

- Stable evaluation/session IDs, media identifiers and canonical URL.
- The rater ID supplied at export.
- Draft/complete status and availability (`not-checked`, `available`, or `unavailable` for new records).
- Rubric ID/version and the complete rubric snapshot.
- All recorded primary and secondary answers plus notes.
- Inclusion result, automatic suggestion/reason, final classification, reviewer override, and optional reason.
- Observed, created, and updated timestamps.

A rubric without classification has no automatic congruence results. Older records may lack fields introduced in later versions. Unanswered optional fields are not imputed.

## Analysis CSV

One row represents one saved evaluation. The export includes metadata/classification columns, JSON `ratings` and `rubricSnapshot` columns, and one `rating.<fieldId>` column for every field appearing across selected records.

Arrays are JSON-encoded, boolean values are `true`/`false`, absent domains are `absent`, and missing optional values are blank. Explicit zeros are retained. Spreadsheet formula prefixes are escaped in string cells; use JSON if you need exact free-text values. Import TikTok IDs as strings, as spreadsheet/numeric readers can round long IDs.

## Selection and storage

Workspaces export the current session. The start screen export includes all sessions and legacy saved records. Completed records are the default selection; enable **Include drafts and unavailable items** to export all saved records in that scope. Unsaved storage failures block workspace exports until saving succeeds.

Rater IDs are required for analysis files only. They label the exported records and are remembered as a convenience for the next export; they do not authenticate a researcher or change locally saved records. If multiple people use one installation, start separate sessions and enter the appropriate ID for each session's export.

The review queue remembers its position independently of completion. Previous/Next preserves drafts; completing a rating can also advance. Videos not reached yet do not have evaluation records and are not included in rating exports.
