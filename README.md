# ExerciseTok

Chrome extension for collecting TikTok samples and independently coding them against a versioned research rubric. The platform adapter, rubric, storage, and exports are separate modules so a Reddit version can reuse the study workflow.

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
2. Choose **Use exercise for depression rubric** to load the built-in rubric immediately, or upload a custom JSON rubric and select **Use uploaded rubric**. The ⓘ button opens instructions and an example download; **Close instructions** dismisses it.
3. In browse mode, open TikTok and click a video's **Expand** control, shown in the prompt. Keep the panel open while browsing. If detection misses a video, use **Refresh detection** or **Add a video by link**.
4. For an imported list, a wider extension window opens with the embedded video beside the rubric. Use **Previous**, **Next**, or **Complete & next**. Only the current video is visible; the next player preloads without autoplay. The original TikTok link and a reload button are always available if embedding fails.
5. Answers save as drafts as you edit. **Save complete** marks the rating ready for export. Revisiting a video in the same session restores your answers; **Resume a session** restores a saved session and review position. Editing a completed rating returns it to draft.

Each new session has its own rubric snapshot and ratings. Imported files never populate another researcher's answers. Choose the same rubric/version for independent raters when that is what your study requires.

Domain radios default to **Absent**. **Accurate**, **Inaccurate**, and **Partial** imply presence. The combined exercise/depression inclusion control and other booleans also default to absent. The automatic global encoding is displayed alongside an optional reviewer override; the override reason is optional.

Secondary analysis fields are collapsed to keep the panel compact. They include the draft paper's adjunct/monotherapy target and exploratory content features. See [rubric documentation](docs/rubrics.md) for their scope.

## Share a blinded list or export analysis data

Open **Export & share**:

- **Download blinded TikTok list** creates a JSON file with only video IDs and clean canonical links. Share this file with the next researcher, who uploads it from the first panel screen.
- **Analysis CSV** or **Analysis JSON** requires a unique rater ID entered at export. The output includes links, answers, rubric definition/version, automatic and final classifications, optional override notes, availability, and timestamps. CSV also has separate `rating.<fieldId>` columns for statistical analysis.

Completed records are selected by default. **Include drafts and unavailable items** includes saved drafts too. A workspace exports its own session; the start screen can export all locally saved sessions, including records from earlier extension versions. Exporting with an ID labels the output without changing saved evaluations. Preserve TikTok IDs as text when importing CSV into statistical software.

Supported list uploads: an ExerciseTok blinded JSON export, a JSON array of full video URLs, or a `.txt` file with one URL per line. Limits: 5,000 videos / 2 MB. Duplicate IDs are removed while preserving first-seen order. Short links and analysis files containing prior ratings are rejected. See [data formats](docs/data-formats.md).

The extension downloads files to your computer; it does not send them to another researcher automatically. Data remains in this Chrome installation until exported. Reinstalling/removing the extension can remove its local data.

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
- `src/domain/`: schemas, default/secondary fields, validation, classification, blinded transfer, and CSV export.
- `src/storage/repository.ts`: session and evaluation storage; reads legacy records without rewriting them.
- `src/shared/ExportPanel.tsx`: session-scoped downloads and rater ID entry.

The player uses TikTok's [official iframe player](https://developers.tiktok.com/doc/embed-player/) and supports opening the original link when an embed is unavailable. Imported-list review uses a separate wide extension window because the [Chrome side panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) does not offer programmatic width control. No video files are downloaded.

## Validation

`npm test` covers rubric validation/classification, absent defaults, rendering, blinded-list validation and round trips, export fields, session isolation, concurrent record storage, and saved queue positions. `npm run build` performs TypeScript checking and bundles the extension.

Before collecting study data in Chrome, try two videos: save a rating, advance, go back, close/reopen the session, export a blinded list, and import it as a fresh session. Verify that answers restore in the original session and remain blank/default in the new one. Live TikTok player availability and page detection depend on the site and need checking in the installed extension.
