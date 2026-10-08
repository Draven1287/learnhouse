# Learning AI portable lesson pilot

A bounded, local-only lesson for teenage learners. No deployment or site migration was performed. No AI API, account, production database, telemetry, or student records are connected. All media is HTML/CSS; no cinematic clip is represented as completed.

## Run

Requires Node.js 22+ and npm. In this directory:

```sh
npm ci --ignore-scripts
npm start
```

Open http://127.0.0.1:4173 . The server binds only to loopback. Keep that process running while previewing. `npm test` runs five lesson-model tests. The runtime assets are served locally from pinned npm dependencies, with no CDN requirement after installation. Use a local HTTP server, not file://.

## Located source, preserved

`<local-project-path>` is the identified standalone site: its package is `learning-ai-site`, README explicitly describes the static site, and CNAME contains `learningai4you.com`. Existing HTML chapters and frontend files are present. There are additional redesign copies under `public/design_extract/learning-ai/project`, `public/PartnerAi/v2-redesign/project`, and an older `Documents/auto changing website for realtime` project. These were not modified or executed. No AGENTS.md or .agents/skills was found in the inspected candidate trees or task ancestor paths. No denied Codex session paths were accessed.

## Real activity technology and scope

SurveyJS Form Library 3.1.2 provides the model, conditional visibility, question rendering, validation, navigation, and quiz checks. It is MIT licensed. The pilot uses hand-authored JSON; it does not use the separately licensed Survey Creator visual editor or paid products.

This is a SurveyJS lesson, **not an H5P package** and not SCORM or xAPI compliant. SurveyJS was selected to prove lightweight, reusable delivery without installing a CMS/LMS. H5P is still preferable if exchange of standard .h5p activities and its authoring ecosystem are priorities. A future H5P implementation needs content packages and their dependency libraries, an H5P-compatible player, and an authoring host (for example an appropriate WordPress/Moodle integration). Static H5P players are possible, but a player/iframe alone does not provide authenticated progress, a gradebook, or cross-device state. Review each chosen H5P content library license and state-resume support. LearnHouse has not been installed or validated in this pilot.

## Author a new lesson

1. Copy `lessons/message-to-judgment.json`. Give it a globally stable `id`; increment `version` for incompatible content changes.
2. Keep stable question names as `activityIds`. Use stable values for choices, distinct from display labels. Page names must remain stable for resume.
3. Edit the SurveyJS `survey.pages` content. Use `visibleIf` for branches and `correctAnswer` for objective checks. HTML content is trusted authored content only; never insert untrusted learner HTML into these fields.
4. Point the fetch URL in `app.js` to the new lesson; update the introductory shell and core-score ID list. This is a reusable pilot structure, not yet a course catalog or general authoring application.
5. Add branch/validation cases to `tests/lesson.test.mjs`; repeat the browser checklist in `VERIFICATION.md`.

The fictional evidence cards support source-evaluation practice; they are explicitly not provider quotations. Reflection is required and length-validated, but never automatically judged for semantic correctness. Learners may revise answers after feedback; scores describe their current answers, not an exam result.

## Persistence and progress contract

See `PROGRESS-CONTRACT.md`. Demo localStorage is device/browser/origin-only. It is unauthenticated and editable by the learner. Changing hostname, scheme or port changes the storage origin. Clearing browser storage or restarting removes this attempt. There is no cross-device synchronization. A disabled/full storage store shows an explicit warning.

## Integration / later migration dependencies

- **Static frontend first:** host the shell, JSON, CSS, JS and pinned runtime assets together under a dedicated lesson route. For production, copy only runtime assets to a public vendor directory (preserving license notices), rather than exposing node_modules. The current Node preview server is development-only.
- **Embed option:** a same-origin page can subscribe to the custom event. An iframe needs an explicit postMessage bridge, target-origin restriction, parent origin validation, schema validation, and deduplication. No such bridge is claimed or enabled here.
- **Authenticated progress:** add identity, access control, a progress API/storage layer, version-aware resume, event validation/deduplication, and server-owned completion rules. Decide the retention and access rules for minors before collecting actual student responses. Never trust the browser's claimed score for assessment.
- **H5P/LMS:** select and test the host and content libraries, recreate/map the activities, maintain the stable logical IDs in an adapter, map H5P xAPI events to this contract, and implement supported content-state restore separately from score recording. The JSON here is not automatically importable to H5P.
- **Site migration:** confirm the authoritative current frontend and deployment target, make a reviewed backup, establish lesson routes and identity/progress ownership, and test links and accessibility before switching anything. No DNS, hosting, production files, or databases have been changed.

References: [SurveyJS source and MIT license](https://github.com/surveyjs/survey-library), [plain-JavaScript setup](https://surveyjs.io/form-library/documentation/get-started-html-css-javascript), [H5P core](https://github.com/h5p/h5p-php-library), [H5P WordPress integration](https://github.com/h5p/h5p-wordpress-plugin).

## Supplemental curriculum

[AI and the Natural Resources Behind It](curriculum/supplemental/ai-and-natural-resources/README.md): supplied content draft and video storyboard, separate from the 15 numbered lessons. No video has been generated or published.
