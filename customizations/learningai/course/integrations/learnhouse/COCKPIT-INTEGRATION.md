# Native LearningAI Cockpit integration

This implements the selected `claude-ui/07-cockpit` interface in LearnHouse React routes. It does not embed the HTML prototype or load its demo accounts, `site.js`, or localStorage progress. Versions 08–11 remain untouched.

## Scope and routes

- `/learningai`: Cockpit home with the original three-part instrument dial, an account-aware next action and saved step.
- `/learningai/course`: real course name/description from the course metadata API; per-lesson status from the authenticated lesson state API. The 15-lesson plan is labeled as a plan, with lessons 04–15 explicitly unreleased.
- `/learningai/intro/01`, `/learningai/intro/02` and `/learningai/intro/03`: numbered lesson covers and step dials. The unnumbered alias selects the next available unfinished lesson.
- `/learningai/lesson/01`, `/learningai/lesson/02` and `/learningai/lesson/03`: four-step native player with lesson-specific practice, formative choices, written self-review and transfer; persisted completion and read-only submitted answers.
- `/learningai/signin`: real LearnHouse password and MFA login through the existing AuthContext. Full sign-in options and password recovery remain linked to the existing LearnHouse flows.
- `/learningai/toolkit`: each available lesson's saved or submitted practice response from the server.
- `/learningai/projects`: explicit unavailable status and a route back to the available lesson.
- `/learningai/settings`: real account identity, sign out, saved-work link, and the existing LearnHouse profile/security settings. No pretend account edits or destructive reset.

The new routes live under the existing organization provider but outside the default student-menu layout. They retain the root session/query providers, organization status handling, signup-field requirement and org authentication/MFA policy gate. API authorization remains authoritative. Existing courses and the original activity presentation remain available.

## Opt-in configuration

Use the existing runtime config mechanism (`server-wrapper.js` collects all `NEXT_PUBLIC_*` variables):

```dotenv
NEXT_PUBLIC_LEARNINGAI_COURSE_UUID=course_<the-real-course-uuid>
NEXT_PUBLIC_LEARNINGAI_ORG_SLUG=default
```

The organization slug defaults to the configured default organization if omitted. With a course configured, that organization's `/` redirects to `/learningai`. Without configuration the existing LearnHouse home is unchanged. Missing configuration, inaccessible courses, mismatched organization ownership, and unavailable managed activities produce explicit recovery states.

The course must contain published, readable `TYPE_CUSTOM` / `SUBTYPE_CUSTOM` activities with `content.learningai` exactly `{ "lesson_id": "lai.ai-you-can-use.l01", "version": 2, "content_version": "2026-10-05-draft.2" }` or the equivalent `l02` or `l03` ID. Lessons 1–2 support frozen versions 1 and 2; Lesson 3 supports version 2 only. Use version 2 for new activity setup. Upgrading an existing activity from 1 to 2 changes only new attempts: existing drafts and submissions retain their recorded `lesson_version` and frozen original definition. Never change its `lesson_id`, activity UUID, or content-version namespace to force an upgrade. Keep each lesson in its own activity; do not change an existing activity's lesson identity. See `LOCAL-FIRST-LESSON.md` for the original setup boundaries. The existing API flag `LEARNHOUSE_LEARNINGAI_PILOT=true` and pilot schema remain prerequisites. This frontend does not enable the pilot, alter permissions, or create learner accounts.

Archivo is self-hosted under `apps/web/public/fonts/archivo`, with the upstream Google Fonts OFL license. Cockpit CSS is scoped to `.lai`; native menu focus/escape behavior, reduced-motion support, visible keyboard focus and responsive layouts are retained.

## Persistence behavior

The player reuses the existing `learningAIRequest` client and authenticated player controller. It retains activity/account/token identity isolation, abort-on-unmount, revision conflicts, backend-required answers and immutable submission.

- Save & continue sends the answers and destination page in a single revision-checked PUT; the screen advances only after confirmation.
- Save failures preserve the current answers and step and never claim success.
- Reload account work retrieves the authoritative saved version, with a warning before discarding unsaved edits.
- A capture-phase link guard and `beforeunload` protect pending work. Browser back and session refresh behavior still warrant broader cross-browser acceptance; a token refresh can remount the existing pilot player.
- Saving a draft does not complete the lesson. Submit retains the existing server transaction for answers plus TrailStep completion. Submitting all available pilots never mark the entire planned 15-lesson course complete.
- Toolkit and home reload account data on entry. Completion means submitted work, not mastery or AI grading.

## Validation for this change

Tested locally against a separate real PostgreSQL/Redis/API stack and synthetic accounts. No production accounts or services were used.

- Production Next.js build, TypeScript and targeted ESLint.
- Existing web suite: 382 tests passed.
- Current pilot API suite: 58 tests and 15 subtests passed, including actual HTTP authentication/authorization, PostgreSQL persistence/concurrency and completion boundaries.
- Browser: real login/signout, signed-out lesson gate, account A completion and account B empty state, save/refresh restoration, reflection submission/reload, conditional checks, actual API outage/recovery, stale-tab rejection/reload, keyboard radio selection, Escape/menu focus, desktop/mobile/tablet layouts.
- Disposable database inspection confirmed separate learner rows; anonymous state GET returned 401.

## Remaining release work

Lessons 1–3 are functional pilot drafts. Lessons 4–15 remain unreleased. Projects and the full toolkit structure remain unavailable or limited; their status is explicit. Native profile/security/recovery screens now use the Cockpit account frame. No custom destructive account reset was introduced. No review-video media is mounted in this Cockpit release. Mobile Safari, actual MFA/org policy enforcement flows, token-expiry transitions, and broader assistive-technology acceptance still need browser testing. Existing API tests cover policy boundaries but do not substitute for those UI checks.

Educator review, retention/deletion policy and the existing pilot's remaining backend acceptance items still apply. This work adds no paid service, Lumi installation, deployment, DNS changes, permissions or security settings.

## Lesson authoring and pacing

The canonical 15-lesson structure and stable IDs are preserved. The earlier eight-session proposal is pacing context, not a replacement lesson count or approval of final pedagogy. Grouping lessons into classroom sessions remains a review decision.

`curriculum/pilot-teaching.json` supplies teaching material; `curriculum/pilot-assessments.json` supplies the version 2 answer contract for Lessons 1–2. Run `python3 customizations/learningai/course/curriculum/build_course.py` from the repository root to regenerate the canonical manifest, review Markdown, portable lesson definitions, server bundles and client course map. Frozen `lesson-01-v1.json` and `lesson-02-v1.json` preserve existing work and its exact criteria. Keep these archives unchanged when regenerating. New attempts on version 2 activities use the revised contract, including required practice and self-review responses. The server checks presence and size, not reasoning quality; the 2,000-character limit is a storage/input bound, not a grade. Version 1 retains its original minimum length for compatibility.

Lesson 1 practices constraint checks, repair and justified tool choice. Lesson 2 distinguishes explicit rules, learned patterns, generation and inference, then asks learners to design tools and test with new examples. Both have two formative checks, answer-specific feedback, conditional remediation and a saved original response. Disagreement and justified non-use are valid; reflection is not semantically auto-graded. The ML concepts were rechecked against Google's introductory ML documentation on 2026-10-11.

The existing LTX v3 media remains a review artifact and is not mounted or published. Lesson 12's canonical written explanation and scenario remain the resource-topic text alternative in the review curriculum; Lesson 12 is not yet a working native learner route.

## Version 2 learning sequence

Lesson 1 saves an original 10-minute plan before revealing the worked example. The transfer changes the limit to five minutes and asks for a revised allocation, an explanation of cuts/retained choices, tool judgment, inclusion and uncertainty. Lesson 2 includes an explicitly fictional prediction table: row B is wrong; row D reuses training data. Learners write an analysis before the comparison choices, then design independent tests and review the limits of their evidence. Submitted work remains immutable. This is formative practice, not demonstrated mastery or certification.

## Deployment handoff boundaries

No production deployment or database migration was performed. This branch is stacked on PR #2; deploy its full tested commit, not only frontend files. Before any separate deployment, review the destination schema and take the deployment team's normal backup/snapshot. The existing bootstrap creates missing tables, but `create_all` does not migrate incompatible existing tables. The API needs PostgreSQL (writes fail closed on SQLite), Redis and the existing LearnHouse auth configuration. Confirm the `learningai_attempt` table has `lesson_version`, JSON answers, page, revision, completed, ownership foreign keys and the unique owner/activity/content-version constraint. This refinement requires no new columns beyond the pilot schema.

Provision a real organization/course/chapter and three distinct published custom activities through the reviewed LearnHouse administration/setup path. Link them in course order 1, 2 and 3 with the exact metadata above (`l01`, `l02` and `l03`). Grant learners access using the existing membership/RBAC/course rules; do not copy the local fixture accounts or configuration. Set the actual course UUID and organization slug in web runtime config and `LEARNHOUSE_LEARNINGAI_PILOT=true` in the API only after target verification. The local `course_local_acceptance` is a disposable fixture, not a production identifier. Verify API/web origin, HTTPS and the deployment's existing auth/cookie configuration separately.

Release gaps remain: educator review and learner testing, production schema compatibility, target course provisioning and real auth-policy/browser acceptance. The custom UI is functional for three lessons; the rest is explicitly a course plan.

## Account journey presentation

For the configured LearningAI organization, the shared Cockpit account frame now
surrounds LearnHouse's native login, registration, passwordless login, recovery,
reset, email verification, OAuth/SSO callback and account screens. Other organizations
retain their standard layout. `/learningai/signin[/NN]` redirects to the native
login with a sanitized return destination, preserving MFA, Turnstile and org policy.
No demo authentication, new identity provider, credential migration or schema
change is introduced by this presentation layer.

Google is offered only when the web server has both existing
`LEARNHOUSE_GOOGLE_CLIENT_ID` and `LEARNHOUSE_GOOGLE_CLIENT_SECRET` configured and
org policy allows it. Passwordless and recovery requests still depend on the
existing API mail configuration; request acceptance is not proof of email delivery.
Failed magic-link requests remain on the form with a retryable error.

Local acceptance uses fictional accounts. Mail success/failure UI was tested with
intercepted local fetch responses; no recovery mail was sent and no password or
MFA setting changed. Live Google/SSO, real mail delivery and a full MFA enrollment
remain deployment-specific acceptance work. The isolated OSS backend has no payment capability. Store, offers and purchases now
show a custom unavailable state without issuing unsupported purchase requests.
Enabled payment backends retain their native functionality. See
[WORKSPACE-ROUTES.md](WORKSPACE-ROUTES.md) for the full native workspace coverage,
responsive/editor acceptance and remaining service-dependent limits.

## Lesson 3 increment

Lesson 3 adds a typed cloud-request ordering attempt before the worked trace, training/inference recap, dated fictional organizer/notice/chat comparison, evidence correction, a new book-swap transfer case and written self-review. It reuses the existing four-step player, revision-checked persistence and immutable submission without schema changes. The metadata namespace remains `2026-10-05-draft.2`; lesson version 2 is explicit. Keep the third activity distinct from existing lesson UUIDs.

Verification: 60 native API tests and 18 subtests, 94 portable curriculum tests, four new server-rendered player tests, production build/TypeScript and targeted ESLint/Ruff passed. Real local HTTP acceptance saved a draft and submitted separate synthetic-learner work, then reauthenticated and read both back. Prior Lesson 1–2 response payloads remained equal. Signed-out requests returned 401; stale saves and submitted overwrites returned 409. No new desktop/mobile/tablet screenshot acceptance was performed in this increment; previous screenshots are not evidence for Lesson 3.

Read [EXECUTION-PLAN.md](../../curriculum/EXECUTION-PLAN.md) and [IMPLEMENTATION-ROADMAP.md](../../curriculum/IMPLEMENTATION-ROADMAP.md). The roadmap records proposals for all 15 canonical lessons without releasing upcoming lessons or changing saved editions. No paid generation or external student account is required. The full custom UI redesign still awaits an actual Claude response.
