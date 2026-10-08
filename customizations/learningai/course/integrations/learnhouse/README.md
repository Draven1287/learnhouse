# LearnHouse first-lesson integration scaffold

Status: **offline contract scaffold; no authenticated integration or live sync**.
Course: `lai.ai-you-can-use`, version `2026-10-05-draft.2`.
Reviewed upstream: `learnhouse/learnhouse@c8515a6f1021a34ddfc34cb3d384e478e32f905e`.

## What is implemented

- `lesson-mapping.json`: all 15 stable lesson IDs, versions, titles, source files, and null LearnHouse IDs. `UNMAPPED` is deliberate. Claude's reported 12/14-lesson alternatives are recorded as unresolved external inventories with no guessed IDs or order-based equivalence.
- `adapter.mjs`: executable schema and semantic validation for mapping, partial answer snapshot, and progress event; first-lesson SurveyJS validation; pure completion-request planner; coarse trail-result parser. No HTTP transport, cookies, tokens, login or route server.
- `fixture-store.mjs`: volatile synthetic repository contract showing per-actor/course/version/attempt isolation, answer save/resume, optimistic revisions and event-id conflict handling. Restarting the process loses everything. It is not production persistence.
- `fixtures/`: fabricated data prominently distinguished by filenames, mapping mode, status, and synthetic principal. Numeric IDs/UUIDs were not returned by LearnHouse. The partial trail example is a parser fixture, not a captured response or a complete Pydantic-schema fixture.
- `tests/`: runs against the actual first-lesson SurveyJS definition plus synthetic adapter boundaries. All existing course tests remain separate and unchanged.
- `upstream-sources.json`: exact upstream commit and retrieved blob hashes.

The validator intentionally permits only `unmapped` and `fixture` modes. Changing a flag cannot enable live calls: there is no network sender. It fails closed for real targets, unsupported lesson integration, external mapping guesses, unknown fields in snapshots/events, invalid choices, overlong text, invalid dates, stale versions, anonymous/API-token fixtures, cross-org access, incomplete required branches, and missing reflection. It recomputes objective score rather than trusting the event. It does not semantically assess written work or require correct answers for formative completion.

## Run from the existing course root

Requires the course's existing Node environment and `survey-core` dependency (already present in the validated cloud copy). No new dependency or package-script change.

```sh
node integrations/learnhouse/validate.mjs
node --test integrations/learnhouse/tests/*.test.mjs
npm test
```

The integration ZIP is an additive patch rooted at `integrations/learnhouse/`. Extract into a copy of the course root containing `curriculum/`, `lessons/`, `package.json`, and installed dependencies. Do not extract over an existing integration folder without reviewing differences. It does not include/repackage the original course or `node_modules`.

## Source-grounded route contract

Pinned router path: `POST /api/v1/trail/add_activity/{activity_uuid}` with no answer JSON body. Despite the router's “started” description, its service inserts a TrailStep with `complete=True`. Calling it on `started`, `resumed`, `answered`, or `page_changed` would incorrectly mark the lesson complete. The planner permits an intent only for a completion event after full answer validation. It reports `NOT_SENT` always.

The service checks course access, finds/creates a trail/run, and treats an existing step as already completed. A database unique constraint exists for (run, activity, user), but deployment migration and concurrent-request behavior still need live testing. Do not claim exactly-once delivery from these fixture tests. Certificate, audit, analytics and webhook side effects exist, so even a synthetic sandbox write needs the correct approved environment.

`GET /api/v1/trail/org/{org_id}/trail` can create a missing trail through its service. It is not guaranteed side-effect-free merely because it is a GET. No such call was made here. Trail steps use numeric activity IDs, while the write route uses activity UUIDs; both must be captured from verified target records. Trail completion is coarse; it cannot restore SurveyJS answers or the current page.

JWT browser sessions and Pro API tokens are different mechanisms. The pinned docs label API tokens Pro; ordinary learner sessions use JWT. This is not evidence that every hosted Free feature/quota is sufficient. Confirm deployment version, plan, courses-feature availability, verified email/login, enrollment/access and actual endpoint behavior. Never impersonate a learner using an organization API token. No token was created, entered or persisted here.

`TYPE_CUSTOM`/`SUBTYPE_CUSTOM` can hold JSON, but stock LearnHouse does not render it. A later fork component must explicitly load the existing SurveyJS lesson renderer and suppress any stock auto-completion behavior for that activity. An iframe alone does not bridge auth, partial state or completion. This patch deliberately does not modify upstream, UI, backend routes, or the course player.

## First authorized live acceptance path (NOT RUN)

1. **Baseline and mapping:** obtain access to the intended LearnHouse fork, pin its actual commit, and confirm the intended Claude/local course inventory. Review IDs/objectives/activities side by side. Keep this 15-lesson course separate until equivalence is explicitly accepted. Create or choose one approved unpublished sandbox course/activity. Read back org/course/chapter/activity numeric IDs and UUIDs, parent relationships and content version. Populate a reviewed mapping in a separate branch; do not relabel fixtures as real.
2. **Renderer:** add a narrowly scoped first-lesson custom component in the authorized fork, preserving upstream and the user's existing design. Use `course-01.json`; test required remediation, feedback, plain-text reflection and keyboard/mobile access. No renderer is included in this patch.
3. **Login and ownership:** use the supported real learner login with two synthetic test accounts. Keep credentials out of fixtures and browser localStorage. On a same-origin server boundary, derive actor/org from verified session middleware and check mapped course/activity access; never accept identity from submitted payloads. Require CSRF/origin protection for state mutations. Expiry/log-out must deny writes and hide the previous learner's state.
4. **Answer storage and resume:** approve a separate authenticated partial-state store and retention/deletion policy. Store actor/org/course/content-version/lesson-version/attempt identity, validated answers, page and monotonic revision. Do not automatically import device-only localStorage, especially across users. Save one answer, refresh/re-login, and verify the same learner resumes it while the other cannot read or overwrite it. Reject stale revisions; document conflict handling and attempt-reset semantics. Use fictional text only until student-data handling is approved.
5. **Completion:** the server loads the saved snapshot and trusted lesson definition, validates every visible required question/branch/text length and recomputes core score. Create a durable outbox intent in the same transaction as submission. Mark this lesson complete only after the learner-authorized upstream completion succeeds and a scoped trail read confirms the expected numeric activity step. Never treat client events or an HTTP attempt as confirmation. No completion should be emitted on starts or partial answers.
6. **Retries and failures:** exercise duplicate submissions, concurrent requests, offline interruption, timeout-after-success, 401, 403, 404, 429 and 5xx. Read/reconcile an uncertain outcome before retrying; persist outbox state; do not assume upstream supports a custom Idempotency-Key header. Stop and fix mapping/access on permanent failures. Account for one coarse completion per learner/activity even when our course has several attempts.
7. **Reset, export, rollback:** resetting a local attempt must not silently remove upstream completion or certification. Choose an explicit policy for edits after completion and course-content upgrades. Prove scoped export/deletion and disable the custom renderer/adapter cleanly. Do not migrate real accounts/progress, publish, deploy or change DNS until separately approved.

Remaining blockers: target fork access, real environment/plan verification, external Claude inventory, renderer implementation in that fork, real auth integration, durable partial-state/outbox storage, and live/browser acceptance. Fixture success does not resolve these.

## Provenance and preservation

All work is additive under this folder. No original course files, source UI, LearnHouse fork, account, API, database, deployment or Claude conversation were changed. This cloud copy has no Git repository; files are ready to review/add to a future authorized branch, not claimed committed or pushed.

Primary links are recorded in `upstream-sources.json`. Important source locations:
- [Trail service](https://github.com/learnhouse/learnhouse/blob/c8515a6f1021a34ddfc34cb3d384e478e32f905e/apps/api/src/services/trail/trail.py)
- [Trail router](https://github.com/learnhouse/learnhouse/blob/c8515a6f1021a34ddfc34cb3d384e478e32f905e/apps/api/src/routers/trail.py)
- [Authentication docs](https://github.com/learnhouse/learnhouse/blob/c8515a6f1021a34ddfc34cb3d384e478e32f905e/docs/content/developers/api/authentication.mdx)
- [Custom activity reference](https://github.com/learnhouse/learnhouse/blob/c8515a6f1021a34ddfc34cb3d384e478e32f905e/docs/content/developers/migration/activity-types.mdx)
