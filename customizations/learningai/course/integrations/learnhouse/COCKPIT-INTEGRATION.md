# Native LearningAI Cockpit integration

This implements the selected `claude-ui/07-cockpit` interface in LearnHouse React routes. It does not embed the HTML prototype or load its demo accounts, `site.js`, or localStorage progress. Versions 08–11 remain untouched.

## Scope and routes

- `/learningai`: Cockpit home with the original three-part instrument dial, an account-aware next action and saved step.
- `/learningai/course`: real course name/description from the course metadata API; first-lesson status from the authenticated lesson state API. The 15-lesson plan is labeled as a plan, with lessons 02–15 explicitly unreleased.
- `/learningai/intro`: lesson cover and step dial.
- `/learningai/lesson`: four-step native player — learn, first choice, second choice plus any required conditional check, reflection; persisted completion and read-only submitted answers.
- `/learningai/signin`: real LearnHouse password and MFA login through the existing AuthContext. Full sign-in options and password recovery remain linked to the existing LearnHouse flows.
- `/learningai/toolkit`: the learner's saved or submitted reflection from the server.
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

The course must contain the first-lesson managed activity documented in `LOCAL-FIRST-LESSON.md`. The existing API flag `LEARNHOUSE_LEARNINGAI_PILOT=true` and pilot schema remain prerequisites. This frontend does not enable the pilot, alter permissions, or create learner accounts.

Archivo is self-hosted under `apps/web/public/fonts/archivo`, with the upstream Google Fonts OFL license. Cockpit CSS is scoped to `.lai`; native menu focus/escape behavior, reduced-motion support, visible keyboard focus and responsive layouts are retained.

## Persistence behavior

The player reuses the existing `learningAIRequest` client and authenticated player controller. It retains activity/account/token identity isolation, abort-on-unmount, revision conflicts, backend-required answers and immutable submission.

- Save & continue sends the answers and destination page in a single revision-checked PUT; the screen advances only after confirmation.
- Save failures preserve the current answers and step and never claim success.
- Reload account work retrieves the authoritative saved version, with a warning before discarding unsaved edits.
- A capture-phase link guard and `beforeunload` protect pending work. Browser back and session refresh behavior still warrant broader cross-browser acceptance; a token refresh can remount the existing pilot player.
- Saving a draft does not complete the lesson. Submit retains the existing server transaction for answers plus TrailStep completion.
- Toolkit and home reload account data on entry. Completion means submitted work, not mastery or AI grading.

## Validation for this change

Tested locally against a separate real PostgreSQL/Redis/API stack and synthetic accounts. No production accounts or services were used.

- Production Next.js build, TypeScript and targeted ESLint.
- Existing web suite: 382 tests passed.
- Pilot API suite: 82 tests and 11 subtests passed, including actual HTTP authentication/authorization, PostgreSQL persistence/concurrency and completion boundaries.
- Browser: real login/signout, signed-out lesson gate, account A completion and account B empty state, save/refresh restoration, reflection submission/reload, conditional checks, actual API outage/recovery, stale-tab rejection/reload, keyboard radio selection, Escape/menu focus, desktop/mobile/tablet layouts.
- Disposable database inspection confirmed separate learner rows; anonymous state GET returned 401.

## Remaining release work

This is the first demonstrable lesson slice, not all 15 lessons. Projects, full toolkit structure, custom profile/security/recovery screens and account reset are not implemented; their status or native destination is explicit. No review-video media is mounted in this Cockpit release. Mobile Safari, actual MFA/org policy enforcement flows, token-expiry transitions, and broader assistive-technology acceptance still need browser testing. Existing API tests cover policy boundaries but do not substitute for those UI checks.

Educator review, retention/deletion policy and the existing pilot's remaining backend acceptance items still apply. This work adds no paid service, Lumi installation, deployment, DNS changes, permissions or security settings.
