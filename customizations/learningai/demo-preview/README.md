# LearningAI isolated demo preview

The active preview uses a dark palette with readable text, controls, feedback, and keyboard focus. Earlier design variants remain alongside this preview.

Tested UI fixes on the separate premium alternative. This path is not registered in LearnHouse routes, public assets, or Dockerfiles. It is not live LearnHouse integration. Original source archives remain in ../source-packages and must never be served as a web root.

Local demo: serve this directory on localhost and open demo.html. Use fictional information only; profiles are local fixtures, not authenticated accounts.

Production preview: run python3 tools/build-preview.py and serve only dist. Its six allowlisted files exclude demo fixtures and internal documents. Account routes fail closed; no live authentication, server progress, or multi-device sync is claimed. The source directory and archival imports are not production build inputs.

Checks: node --check site.js; python3 tools/build-preview.py; open tests/regression.html from a localhost server. Seventeen browser regression assertions passed in Chrome. See evidence and FEATURE-INVENTORY.md / INTEGRATION-PLAN.md.
