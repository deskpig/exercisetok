# ExerciseTok

Chrome extension for collecting TikTok samples and independently coding them against a versioned research rubric. The platform adapter, rubric, storage, and exports are separate modules so a Reddit version can reuse the study workflow.

The current UI uses a shared visual system: a pale blue-gray canvas, white rounded cards, thin neutral dividers, purple primary actions, compact monospace eyebrow labels, custom radio/checkbox controls, and a pale blue classification panel. It is implemented through `src/shared/tokens.css`, `styles.css`, `Icon.tsx`, and `SectionHeader.tsx` so the same treatment carries across setup, browse, sequential review, rubric upload, exports, and confirmation dialogs. The supplied screenshots were available as the visual reference; the linked Figma file was unavailable to the implementation browser, so its exact font metadata and measurements remain unverified.

## Run locally

Use Node.js 24. Run these commands in your Ubuntu terminal **inside the downloaded/cloned repository folder**:

```bash
cd ~/misc-projects/exercisetok
npm ci
npm test
npm run build
```

In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this repository's `dist/` folder. Click ExerciseTok's toolbar icon to open the panel.

`npm run dev` serves a development-only browser preview at `/panel.html`. Its localStorage data is separate from the installed extension; live TikTok detection requires loading the extension.

## Collect or independently review

1. Choose **Browse new TikToks** or **Upload another researcher’s TikTok list**.
2. Choose **Use exercise for depression rubric** to load the built-in rubric immediately, or click **Upload custom rubric** to open the guide and **Choose JSON file** together. The guide shows two code samples: the file structure and a field example. Click **options**, **range**, **custom-string**, or **custom-number** to update the example, then copy/download a valid file. Select your file and click **Use uploaded rubric**. Only a fields array is required; names, IDs, versions, and defaults are optional. Every upload error includes the filename, cause, line, and column. Syntax and invalid-field errors point to the source; file-level failures explicitly use line 1, column 1 as a document-start reference.
3. In browse mode, keep the panel open while viewing videos or photo slideshows. On For You, click **Detect TikTok** to identify the most visible post. If its link is not exposed, the button opens that post's comments and tries again. Automatic detection never clicks comments. You can also open a post's **Expand** control or use **Add a TikTok by link**.
4. For an imported list, a wider extension window opens with the embedded post beside the rubric. Use **Previous**, **Next**, or **Complete & next** between TikToks; use the arrows **inside the player** between slideshow images. Only the current post is visible; the next player preloads without autoplay. The original TikTok link and a reload button are always available if embedding fails.
5. Answers save as drafts as you edit. **Save complete** marks the rating ready for export. Revisiting a video in the same session restores your answers; **Resume a session** restores a saved session and review position. Editing a completed rating returns it to draft.

Each new session has its own rubric snapshot and ratings. Imported files never populate another researcher's answers. Choose the same rubric/version for independent raters when that is what your study requires.

Domain radios default to **Absent**. **Accurate**, **Inaccurate**, and **Partial** imply presence. The combined inclusion control defaults to absent; **Overall message conflicts with CANMAT guidelines** uses **False / True**, defaulting to False. The actionable-guidance label is **Guidance is overall actionable and guideline-congruent**. The automatic global encoding and optional reviewer override are preserved; the override reason is optional.

Secondary analysis fields are collapsed to keep the panel compact. Views and comments now use sliders with count bands from zero through **100,000,000+**, plus **Not recorded**. Likes and shares have been removed from the new built-in rubric. The long encoding and secondary-section introductions have been removed; individual field criteria still expand on demand. See [rubric documentation](docs/rubrics.md) for the analysis scope and bands.

In built-in rubric version 6, count guidance appears directly before the views/comments controls. One **Secondary analysis notes** box collects treatment context, citations, and other observations. Collection time is recorded automatically; the old request to note collection timing is hidden in both new and resumed built-in sessions. Older sessions retain their original fields and saved data.

Detection checks the visible post as the feed scrolls or recycles its player, and ignores unrelated links in captions/comments. Changing posts waits for saved answers and pending writes; an older detection response cannot replace a newer post. If an extension update disconnected the detector, the panel reconnects it once using the bundled content script. The `scripting` permission is used only for this repair on the existing `www.tiktok.com` host permission. Automatic detection never opens comments; if TikTok exposes no post link, use **Detect TikTok** or the manual-link fallback.

## Share a blinded list or export analysis data

Open **Export & share**:

- **Download blinded TikTok list** creates a JSON file with only video IDs and clean canonical links. Share this file with the next researcher, who uploads it from the first panel screen.
- **Analysis CSV** or **Analysis JSON** requires a unique rater ID entered at export. The output includes links, answers, rubric definition/version, automatic and final classifications, optional override notes, availability, and timestamps. `collectedAt` records the first evaluation time in UTC automatically and stays fixed on revisits; `updatedAt` records later changes. In list review, collection time is when that item's evaluation is created, not the queue import time. Legacy exports use their original `createdAt` as the collection-time fallback. CSV also has separate `rating.<fieldId>` columns for statistical analysis.

Completed records are selected by default. **Include drafts and unavailable items** includes saved drafts too. A workspace exports its own session; the start screen can export all locally saved sessions, including records from earlier extension versions. Exporting with an ID labels the output without changing saved evaluations. Preserve TikTok IDs as text when importing CSV into statistical software.

Supported list uploads: an ExerciseTok blinded JSON export, a JSON array of full TikTok URLs, or a `.txt` file with one URL per line. Both `/video/ID` and `/photo/ID` links work, including mixed lists. Limits: 5,000 posts / 2 MB. Duplicate IDs are removed while preserving first-seen order. Short links and analysis files containing prior ratings are rejected. See [data formats](docs/data-formats.md).

The extension downloads files to your computer; it does not send them to another researcher automatically. Data remains in this Chrome installation until exported. Reinstalling/removing the extension can remove its local data.

## Clear saved sessions and lists

On the start screen, choose **Clear saved sessions & lists**. First select **Continue**, then confirm **Yes, permanently clear** on the second screen. Cancel at either step leaves the data unchanged.

This removes all saved sessions, imported queues, and associated ratings, including legacy ratings. Downloaded exports and rubric/rater preferences remain. Other open workspaces stop editing a cleared session, and pending/stale saves cannot recreate it. The clear action has no undo.

## Update an installed extension

From the repository folder:

```bash
git pull --ff-only
npm ci
npm test
npm run build
```

At `chrome://extensions`, reload ExerciseTok. Refresh TikTok and close/reopen any old review windows. Existing saved records remain available from the start screen's export section. Start a new session and select the built-in rubric to use the latest fields; existing sessions retain their original rubric.

## Code map

- `src/background/index.ts`: toolbar action opens the side panel.
- `src/content/index.ts`, `src/platforms/`: detect the active TikTok and send media changes; a future Reddit adapter belongs here.
- `src/panel/main.tsx` → `src/shared/WorkflowApp.tsx`: start screen, list import, rubric choice, and session resume.
- `src/shared/BrowseWorkspace.tsx`: active-tab collection and manual-link fallback.
- `src/review/main.tsx` → `src/shared/ReviewWorkspace.tsx`: sequential embedded review with a persisted position.
- `src/shared/EvaluationEditor.tsx`, `RubricForm.tsx`: autosaved coding, generic fields, completion, and overrides.
- `src/shared/RubricInstructions.tsx`, `src/domain/rubricImport.ts`: interactive examples and minimal-to-full schema normalization.
- `src/shared/ClearSavedData.tsx`: two confirmation steps for clearing local research data.
- `src/domain/`: schemas, default/secondary fields, validation, classification, blinded transfer, and CSV export.
- `src/storage/repository.ts`: session and evaluation storage; reads legacy records without rewriting them.
- `src/shared/ExportPanel.tsx`: session-scoped downloads and rater ID entry.

The player uses TikTok's [official iframe player](https://developers.tiktok.com/doc/embed-player/) and supports opening the original link when an embed is unavailable. Imported-list review uses a separate wide extension window because the [Chrome side panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) does not offer programmatic width control. No video files are downloaded.

## Validation

`npm test` covers rubric validation/classification, custom defaults and ranges, interactive examples/sliders/confirmations, mixed video/photo handoffs, visible-feed detection and comment fallback, session isolation, and deletion/save races. Detection tests use DOM fixtures; they do not prove that every live TikTok layout is supported. `npm run build` checks TypeScript and builds both extension pages and a standalone classic content script suitable for the Chrome manifest.

Before collecting study data in Chrome, try two videos: save a rating, advance, go back, close/reopen the session, export a blinded list, and import it as a fresh session. Verify that answers restore in the original session and remain blank/default in the new one. Live TikTok player availability and page detection depend on the site and need checking in the installed extension.
