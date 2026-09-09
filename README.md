# ExerciseTok

Research-oriented Chrome extension for capturing TikTok samples and coding them against a versioned rubric. The code separates platform extraction from study data, so a Reddit adapter can be added later.

## Blueprint

1. **Platform adapters** read a canonical URL and public metadata from the active page. TikTok is implemented; Reddit should implement the same `PlatformAdapter` interface.
2. **Side-panel collector** follows the active video, renders the current rubric, validates required responses, and saves a draft or complete evaluation.
3. **Local repository** stores evaluations and rubric versions in `chrome.storage.local`. This is appropriate for a pilot and keeps collection credentials out of scope.
4. **Review queue** lists collected samples, opens each canonical link, and exports JSON or CSV for handoff. A production phase can add authenticated sync and blind second-rating.
5. **Rubric as data** makes the attached study rubric importable without changing UI code. Every evaluation records the rubric ID and version.

## Why an extension

An extension is the best capture surface because the researcher stays in TikTok while coding. For multi-researcher work, pair it with a small backend/dashboard rather than relying on browser storage. TikTok embedding is deliberately not the only review path: embeds can be unavailable, removed, region-restricted, or governed by platform terms. The canonical-link workflow remains the durable fallback.

## Run locally

```bash
npm install
npm test
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist/`. Open TikTok, click the extension icon, and use the side panel.

## Rubric schema

The default rubric implements the research team's exercise/depression inclusion criteria and encoding rules. Criteria are study-provided text, not independently verified clinical guidance. Safety is counted as one domain across its three disclaimers.

Version 2 uses one combined inclusion check and compact radios: Absent / Accurate / Inaccurate / Partial for domains, Absent / Present for boolean checks. Defaults are absent and saved as such. Guidance and optional notes are collapsed to save space. Applying the rubric shows a prompt to open TikTok and use the video's Expand control to begin viewing.

In the panel or review page, expand **Upload or download a project rubric**. Download the current rubric as JSON, edit it for your study, upload it, inspect the candidate name/version, then apply it. Applying clears the unsaved panel form. Existing saved records remain readable.

Click **Choose exercise/depression rubric** to immediately load the built-in study criteria, without uploading a file or clicking Apply. Any version conflict is handled automatically by assigning a new version. This replaces the unsaved form; saved evaluations remain intact. Uploaded custom rubrics still use a preview and Apply step.

See [docs/rubrics.md](docs/rubrics.md) for the schema and classification precedence. Every new evaluation archives the rubric definition, automatic suggestion and reason, final encoding, and any reviewer override and reason. JSON and CSV exports include these fields.

## Updating an installed extension

Use Node.js 24. From the repository folder:

```bash
git pull --ff-only
npm ci
npm test
npm run build
```

At `chrome://extensions`, reload ExerciseTok. Refresh your TikTok page and reopen the panel. Save/export in-progress work before updating.

## Research and privacy guardrails

- Capture only fields approved by the protocol/IRB and document retention/deletion rules.
- Treat handles, captions, notes, and links as potentially identifiable data.
- Do not download media or bypass access controls; collect only researcher-viewed pages.
- Check TikTok's current terms and institutional policy before field deployment.
- For inter-rater reliability, store one evaluation per `media.externalId + raterId + rubricVersion` in the future backend and hide prior ratings from the second rater.

## Next milestones

- Pilot the study rubric with researchers and refine the wording and decision rules.
- Add IndexedDB plus an append-only event log for stronger crash recovery.
- Add a backend (Postgres + authenticated API) for study/team/project membership, assignments, blind second ratings, audit logs, and data retention.
- Add sampling-session metadata, duplicate policy, adjudication, and Cohen's kappa/weighted kappa exports.
- Add `src/platforms/reddit.ts` and extend manifest host permissions.
