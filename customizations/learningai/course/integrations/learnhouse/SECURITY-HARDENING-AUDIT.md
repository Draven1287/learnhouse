# Security hardening audit — 2026-10-13

Scope: the isolated Cockpit integration branch, compared with upstream LearnHouse
hardening commits through `45cf5d4f`. This is a source review, not a production
security certification. No production environment or database was used.

## Applied in this branch

| Boundary | Evidence | Result |
| --- | --- | --- |
| Cross-organization roles | Upstream `0ce31fc3` pins role joins to the target membership; our pre-patch join lacked both predicates. | Added predicates and regression tests for course/account writes and an allowed same-org write. |
| Credentialed origins | Upstream `0ce31fc3` filters an overly broad allowed-origin regex. Our multi-tenant CORS and CSRF accepted `.*` and the shipped `config.yaml` regex, which both match `https://unrelated.invalid`. | Both now ignore a regex that matches an unrelated origin. CSRF uses CORS's domain-derived fallback so legitimate frontend origins continue to work in both tenancy modes. Tests cover the shipped pattern, explicit origins, and the single-tenant frontend. |
| API schema exposure | Upstream `a2558c55`; our production app hid `/docs` and `/redoc` but left `/openapi.json` at FastAPI's default. | Schema route is now present only in development mode. |
| Public author/profile projection | Upstream `7b8a3e22`, previously backported in this branch. | Focused privacy regressions passed at the Lesson 3 checkpoint. |

## Remaining before an internet-facing launch

The fetched upstream history contains additional hardening rounds that were **not**
ported wholesale. Their relevance to each deployment and exact equivalence to
this branch still require review. Do not treat a passing test suite as proof that
these gaps are closed.

1. **Auth, session and account actions:** Review `a2558c55`, `e2b24854`, and
   `33ed0d29` for login lockout, verification, password reset, email changes,
   magic links, trusted link origins, and rate limits. This branch has some
   earlier controls; round-by-round parity has not been established.
2. **API-token principals and rights:** Review `3482e9f5`, `d343f311`, and
   `174a8dc2` for each token-enabled admin, course, community, and export route.
   Existing token gates are not an exhaustive rights audit.
3. **Content, tenant and admin gates:** Review `7b8a3e22`, `63a92ea2`,
   `0ce31fc3`, `6063287f`, and `d8e3d399` beyond the specific fixes above.
   This includes assignments, folders, media, code execution, paid content,
   destructive org operations, and content-derived endpoints.
4. **Resource exhaustion:** `c525ea72` adds API request-body and unauthenticated
   collaboration socket limits. Those controls are not present in this branch.
5. **Dependencies:** `f600f385` raises Next from `^16.2.9` to `^16.4.0`, sharp
   from `^0.35.0` to `^0.35.5`, and several transitive floors. Current lockfile
   resolves Next `16.3.2` and sharp `0.35.3`. The exact applicable advisories
   and dependency compatibility were not verified, so this audit does not label
   either installed version vulnerable or substitute an untested lockfile.
6. **Operational gates:** The previous draft-PR CI ran tests successfully but
   failed at Codecov upload because tokenless upload was rejected. That is a
   reporting/integration blocker, not a failing API test. Browser acceptance
   still needs a supported unlocked desktop session. Educator review of lesson
   content remains a human launch gate.

The Lesson 3 and Cockpit route behavior is otherwise unchanged by this pass.
There was no deployment, production data access, credential change, or new
paid service.
