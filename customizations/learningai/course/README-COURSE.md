# AI You Can Use — course review package

Start with [the 15-lesson draft](curriculum/AI-YOU-CAN-USE-COURSE-DRAFT.md), [structured manifest](curriculum/course-manifest.json), and [Claude/LearnHouse handoff](curriculum/CLAUDE-LEARNHOUSE-HANDOFF.txt).

All 15 lessons run through the actual SurveyJS runtime at `course.html?lesson=1` through `course.html?lesson=15`. Use the lesson selector or the next-lesson link after completion. This is a curriculum draft for review, not a certified course.

Run `npm ci --ignore-scripts`, `npm start`, then open http://127.0.0.1:4173/course.html?lesson=1 . Run `npm test` for 94 model/controller tests. [Verification](curriculum/IMPLEMENTATION-AND-VERIFICATION.md) separates automated checks from pending browser checks. Browser control was stopped; no bypass attempted.

The original pilot remains at index.html unchanged. Saving is device-only. No deployment, external model, account creation, LearnHouse write, or production data connection occurred.
