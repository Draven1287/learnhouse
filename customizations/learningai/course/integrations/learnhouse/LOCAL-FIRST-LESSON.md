# LearningAI first-lesson integration

The local pilot adds a native React custom-activity player and authenticated state endpoints under `/api/v1/learningai/{activity_uuid}`: GET state, PUT state, POST submit. Activation requires `LEARNHOUSE_LEARNINGAI_PILOT=true`; it is disabled by default.

Create a published sandbox `TYPE_CUSTOM` / `SUBTYPE_CUSTOM` activity with the content reference below, retaining normal chapter/course/organization ownership and account access:

```json
{"learningai":{"lesson_id":"lai.ai-you-can-use.l01","version":1,"content_version":"2026-10-05-draft.2"}}
```

The API validates choices, conditional branches and required reflection length against its bundled lesson contract. User, organization and course identities come from authenticated server context. Organization membership, course RBAC, group and activity/chapter restrictions apply. API-token principals cannot act as learners.

A new database migration stores answers by learner, organization, course, activity and content version. PostgreSQL row locks serialize learner writes; stale revisions reject overwrites. Save does not mark completion. Submit stores answers and TrailStep completion in one transaction; identical completed retries retain the original revision. Completed work is immutable in this pilot. Generic mark/unmark and course reset cannot bypass managed activity state.

Validation used Python 3.14.7, Bun 1.4.2 and disposable PostgreSQL 17.11 fixtures: 80 API tests and 11 subtests passed, including nine actual HTTP/router authentication, RBAC, persistence, completion, concurrency and rollback cases. Bun frozen-lock installation, 375 web tests and TypeScript checking passed. HTTP cases override database wiring only and exercise real signed-session/cookie verification and completion. The unrelated pgvector embeddings table is excluded from those fixtures.

Run API tests from `apps/api` with `python -m pytest src/tests/learningai src/tests/routers/test_trail_router.py src/tests/services/test_course_locks_service.py`. PostgreSQL tests require an explicitly disposable localhost `LEARNINGAI_TEST_DATABASE_URL`; each fixture creates and removes its own random schema. Run web tests and TypeScript checks with the project's locked Bun toolchain.

Remaining review: integrated browser/keyboard/mobile/session acceptance, password-login Redis integration, interactions with upstream enrollment concurrency, and completion side-effect policy. The pilot does not emit certificates, webhooks or analytics. Reflection validation is structural, not semantic grading. Full curriculum content needs educator review before learner release. Retention, export/deletion and content-version upgrades require a policy before collecting student text. These local checks do not establish deployment readiness or enable enterprise licensing features.
