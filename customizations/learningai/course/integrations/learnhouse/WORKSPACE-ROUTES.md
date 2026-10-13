# Cockpit route coverage

This extends the selected 07 Cockpit design to the configured LearningAI organization's native LearnHouse routes. Existing auth/session, org policy, RBAC, feature/license gates, course/editor persistence and legal/attribution controls remain native. No paid backend, provider, credential or production change is included.

## Shared presentation coverage

| Route family | Page files | Presentation boundary |
| --- | ---: | --- |
| Organization learner + teaching workspace | 49 | Organization layout; native student navigation, dashboard shell, forms, tables, dialogs and editor controls use Cockpit tokens. LearningAI and account routes retain their dedicated frames. |
| Authentication | 9 | Existing Cockpit auth boundary; return destinations and native security gates preserved. |
| Instance administration | 7 | Cockpit workspace around existing provider/license gates, including the unavailable screen. |
| Organization hub | 5 | Cockpit workspace inside the existing deployment-mode gate. |
| Standalone editors | 2 | Tenant-resolved workspace; explicit rich-text toolbar, document, menu and phone-state styling. |
| Home, board, payment callback, embed | 4 | Tenant-resolved workspace; embed no longer forces a light palette for the configured org. |
| Error boundaries and not-found | — | Cockpit error surfaces, including organization load/inactive errors and a custom 404. Root fatal-error controls retain their recovery logic. |

All 76 page files are below. This is layout coverage, not a claim that every feature/provider and data-dependent state has been exercised. Other organizations retain their configured presentation. Uploaded media, authored inline colors and third-party iframe documents keep their own content styling.

## Interaction changes

- Native navigation keeps its permission/feature-filtered destinations and user menu. At narrower widths it uses a named compact toggle, inert closed content, Escape dismissal with focus restoration, and wrapping menu links.
- Native course metadata stacks below content on tablets; shared form controls override the old inline white background.
- The rich-text editor's 33 toolbar/menu controls and Save control are native buttons, usable by keyboard. The existing phone editing restriction remains explicit and includes a return-to-course-management link.
- Store, individual offers and account purchases show a custom unavailable state when the deployment or resolved organization capability disables payments. Disabled purchases issue no enrollment query. Store transport failures remain an explicit unavailable/error state instead of a fabricated empty list. Existing API enforcement is unchanged.
- Theme ownership is reference-counted across nested frames so portals do not lose their theme when a child frame unmounts.

## Acceptance and limits

Production build includes TypeScript. Web checks include payment capability precedence and unknown/failure behavior. Live local browser checks cover real learner/admin login, learner denial at dashboard, native course and saved pilot player, compact menu keyboard behavior, account/store unavailable states, course management and dialogs. A separate private unpublished local test course and draft activity were created; a fictional rich-text response was saved with the keyboard and read back after reload. Pilot lesson definitions, publication/access settings and learner submissions were not changed.

The local rich-text editor remains desktop/tablet only, matching upstream behavior; phone users can return safely. Real mail delivery, Google/SSO, MFA enrollment, billing, external embeds, live collaboration, mobile Safari and comprehensive assistive-technology acceptance require appropriate fixtures/services. No unavailable feature has been enabled for this UI work. Lessons 03–15 remain unreleased.

## Source route inventory

- `(hub)/account/page.tsx`
- `(hub)/billing/page.tsx`
- `(hub)/new/page.tsx`
- `(hub)/organizations/page.tsx`
- `(hub)/subscriptions/page.tsx`
- `admin/(dashboard)/analytics/page.tsx`
- `admin/(dashboard)/developers/page.tsx`
- `admin/(dashboard)/organizations/[orgId]/page.tsx`
- `admin/(dashboard)/organizations/page.tsx`
- `admin/(dashboard)/page.tsx`
- `admin/(dashboard)/users/page.tsx`
- `admin/login/page.tsx`
- `auth/callback/google/page.tsx`
- `auth/forgot/page.tsx`
- `auth/login/page.tsx`
- `auth/magic/page.tsx`
- `auth/reset/page.tsx`
- `auth/signup/page.tsx`
- `auth/sso/callback/page.tsx`
- `auth/token-exchange/page.tsx`
- `auth/verify-email/page.tsx`
- `board/[boarduuid]/page.tsx`
- `editor/course/[courseid]/activity/[activityuuid]/edit/page.tsx`
- `editor/playground/[playgrounduuid]/edit/page.tsx`
- `embed/[orgslug]/course/[courseuuid]/activity/[activityid]/page.tsx`
- `home/page.tsx`
- `orgs/[orgslug]/(withmenu)/account/[subpage]/page.tsx`
- `orgs/[orgslug]/(withmenu)/account/page.tsx`
- `orgs/[orgslug]/(withmenu)/boards/page.tsx`
- `orgs/[orgslug]/(withmenu)/certificates/[uuid]/verify/page.tsx`
- `orgs/[orgslug]/(withmenu)/communities/page.tsx`
- `orgs/[orgslug]/(withmenu)/community/[communityuuid]/discussion/[discussionuuid]/page.tsx`
- `orgs/[orgslug]/(withmenu)/community/[communityuuid]/page.tsx`
- `orgs/[orgslug]/(withmenu)/copilot/page.tsx`
- `orgs/[orgslug]/(withmenu)/course/[courseuuid]/activity/[activityid]/page.tsx`
- `orgs/[orgslug]/(withmenu)/course/[courseuuid]/page.tsx`
- `orgs/[orgslug]/(withmenu)/courses/page.tsx`
- `orgs/[orgslug]/(withmenu)/library/folder/[folderid]/page.tsx`
- `orgs/[orgslug]/(withmenu)/library/page.tsx`
- `orgs/[orgslug]/(withmenu)/page.tsx`
- `orgs/[orgslug]/(withmenu)/playground/[playgrounduuid]/page.tsx`
- `orgs/[orgslug]/(withmenu)/playgrounds/page.tsx`
- `orgs/[orgslug]/(withmenu)/podcast/[podcastuuid]/page.tsx`
- `orgs/[orgslug]/(withmenu)/podcasts/page.tsx`
- `orgs/[orgslug]/(withmenu)/search/page.tsx`
- `orgs/[orgslug]/(withmenu)/store/offers/[offerid]/page.tsx`
- `orgs/[orgslug]/(withmenu)/store/page.tsx`
- `orgs/[orgslug]/(withmenu)/trail/page.tsx`
- `orgs/[orgslug]/(withmenu)/user/[username]/page.tsx`
- `orgs/[orgslug]/dash/analytics/page.tsx`
- `orgs/[orgslug]/dash/assignments/[assignmentuuid]/page.tsx`
- `orgs/[orgslug]/dash/assignments/page.tsx`
- `orgs/[orgslug]/dash/boards/[boarduuid]/[subpage]/page.tsx`
- `orgs/[orgslug]/dash/boards/[boarduuid]/page.tsx`
- `orgs/[orgslug]/dash/boards/page.tsx`
- `orgs/[orgslug]/dash/communities/[communityuuid]/[subpage]/page.tsx`
- `orgs/[orgslug]/dash/communities/[communityuuid]/page.tsx`
- `orgs/[orgslug]/dash/communities/page.tsx`
- `orgs/[orgslug]/dash/courses/course/[courseuuid]/[subpage]/page.tsx`
- `orgs/[orgslug]/dash/courses/migrate/page.tsx`
- `orgs/[orgslug]/dash/courses/page.tsx`
- `orgs/[orgslug]/dash/developers/[subpage]/page.tsx`
- `orgs/[orgslug]/dash/developers/page.tsx`
- `orgs/[orgslug]/dash/library/folder/[folderid]/page.tsx`
- `orgs/[orgslug]/dash/library/page.tsx`
- `orgs/[orgslug]/dash/onboarding/page.tsx`
- `orgs/[orgslug]/dash/org/settings/[subpage]/page.tsx`
- `orgs/[orgslug]/dash/page.tsx`
- `orgs/[orgslug]/dash/payments/[subpage]/page.tsx`
- `orgs/[orgslug]/dash/playgrounds/page.tsx`
- `orgs/[orgslug]/dash/podcasts/page.tsx`
- `orgs/[orgslug]/dash/podcasts/podcast/[podcastuuid]/[subpage]/page.tsx`
- `orgs/[orgslug]/dash/users/analytics/[userId]/page.tsx`
- `orgs/[orgslug]/dash/users/settings/[subpage]/page.tsx`
- `orgs/[orgslug]/learningai/[[...screen]]/page.tsx`
- `payments/stripe/connect/oauth/page.tsx`
