# Upstream security integration checkpoint

Public deployment remains blocked on target review and the remaining applicable security work. This document is a scoped integration record, not a security certification.

## Reviewed baseline and evidence

Lesson 3 was checkpointed independently at local commit `13e0a643de03fbb050ebc3fd58770ef4df9331b8`, tree `a4a95aa3f7c24495cb1fe22c958bc6bd46975b8b`, on top of the tree equivalent to published `95ffd3a89c744d5ea2e0ca07cef8540386b7cf1e`. All changes stay in the isolated integration checkout; no production service or data was touched.

The GitHub comparison of published baseline `95ffd3a` to reported upstream `45cf5d4f78cf537064070dc8e315a64990d14966` confirms divergence: 71 upstream-only commits, 16 baseline-only commits, common ancestor `c8515a6f1021a34ddfc34cb3d384e478e32f905e`. The file summary returned 300 entries and may be capped; it is not a complete security inventory. A missing commit does not prove its vulnerability applies here. No blanket merge or rebase was performed.

Reviewed source: [upstream 7b8a3e222465f0f6cda4e2fc1f281b8b84b05a8a](https://github.com/learnhouse/learnhouse/commit/7b8a3e222465f0f6cda4e2fc1f281b8b84b05a8a), which changes 31 files. The author/member projection subset was reviewed against actual local producers, response models and consumers. The upstream regression file reproduced **seven failures** on this baseline (two authorized-editor cases already passed).

## Applied subset

| Surface | Confirmed issue and change |
| --- | --- |
| Course and podcast authors | `AuthorWithRole.user` exposed full `UserRead`, including email and internal fields. Use existing `UserReadAuthor`, limited to ID, UUID, username, first/last name and avatar. |
| Course list/search/meta/create/update/clone and explore | Every author constructor now uses the minimal projection; no alternate course serialization path keeps the private model. |
| AI activity/editor author constructors | Update their imports and constructors to the same minimal projection so they remain compatible. No model call or AI access behavior is enabled by this change. |
| Course contributors | Readers get the minimal projection. Existing course editors retain the full record needed by contributor management, determined by a non-raising UPDATE authorization check after READ. |
| Public board members | Readers receive no member email; authorized board editors retain it. |
| Usergroup member lists | Use existing `UserReadPublic`; the router already declares that response type. Private email, login and signup metadata stay excluded. |

The implementation selectively applies the reviewed upstream patches and accompanying privacy regressions. It does **not** claim to have incorporated the rest of the upstream commit. Existing tenant/resource authorization still runs; no new permission is granted. No database schema change is needed.

## Verification

- Before: upstream privacy regressions **7 failed, 2 passed**, establishing local applicability.
- After: **12 privacy tests passed**, including added real anonymous HTTP router tests for public course and `/meta`, exact public display-field projection, planted private metadata exclusion, and podcast-model projection.
- Related course, contributor, explore, podcast, board and usergroup suites: **143 passed** before the three additional regression checks.
- Full API suite and final draft-PR CI are recorded in the task handoff once terminal. Tests use isolated fixtures; learner data and published resources are untouched.

## Remaining review scope

The rest of `7b8a3e22` changes content-derived reads: activity AI/RAG scope, scenario/editor rights, playground duplication/generation, course export and version-history authorization, and cross-organization resource/usergroup links. Those patches were inspected as review scope but are **not included in this projection checkpoint**. Reproduce each relevant local path, map dependencies and provider behavior, then integrate with deny/allow/cross-tenant regressions before treating it as resolved. Paid/provider calls must remain mocked in tests.

Other reported upstream areas—CSRF, verification/reset/login, trusted credential-link origins, request-size limits, unauthenticated collaboration and Next.js/sharp advisories—remain applicability checks, not confirmed defects merely because their commits are absent. In particular, the reported `e0ee5ba5` helper `get_member_link_base_url` is absent from this baseline; do not blindly cherry-pick it.

`app.py` currently disables `/docs` and `/redoc` outside development but does not override FastAPI’s default `openapi_url`. That is a conditional target-exposure/hardening question, distinct from the reproduced private-author data leak; evaluate ingress and intended API discoverability. The reported `a2558c55` change was not silently applied.

No deployment, hosting configuration, credentials, production migration, DNS or new spending was performed. A future handoff must use the final tested tree and retain Lesson 1–3 progress contracts and frozen prior editions.
