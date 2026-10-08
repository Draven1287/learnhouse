# LearningAI: every version

Each folder is a complete, self-contained copy of one version of the site. Open one by running a small local server from that folder:

    cd "09-story-home-current"
    python3 -m http.server 8000

Then visit http://localhost:8000. (Double-clicking index.html also works for most of them.)

| Folder | What it is | Date |
|---|---|---|
| 00-all-versions-page | The gallery page: screenshots of every version, with links | Oct 4–5 |
| 01-first-site | First website rebuild | Oct 3 |
| 02-student-app | App-style teen UI (landscape background) | Oct 3–4 |
| 03-redesign-handoff | Audit and redesign plan document | Oct 3 |
| 04-big-numeral | First black-and-white version: greeting plus a huge silver lesson number | Oct 4 morning |
| 05-greeting-and-track | Greeting, your rule, and three rows of lesson dots | Oct 4 afternoon |
| 06-home-concepts | The three Home concepts (Cockpit, Cover, Invitation) and the comparison page | Oct 4 |
| 07-cockpit | Cockpit dial on every page, with the review-package course | Oct 5 |
| 08-briefing-home | Home as a spoken personal briefing (no dial) | Oct 5 |
| 09-story-home-current | Latest: briefing over the point-cloud sphere, statement, one screen per part, specs. Includes INTEGRATION.md, tools/build_course.py and the review package in content/ | Oct 5 |

Versions 04–06 use the older course content. Versions 07–09 use the "AI You Can Use" review package. The test accounts are fake and local-only.
| 10-polished-proposal | Latest proposal (not yet published): one-screen Home with time, greeting, progress, quote; per-account progress; sign-in with Google/email, verification code and consent screens (prototype); reviewer fixes | Oct 5 |
| 11-design-refinement | Refinement of 10 (core flow): shorter lesson 01 intro, bounded writing boxes, student wording for lesson 01 (student-copy.js), 0%/partial/complete progress with change-only motion, honest browser-only saving and storage-failure states. See CHANGES.md | Oct 5 |
