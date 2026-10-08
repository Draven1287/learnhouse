# LearningAI product sources

- `demo-preview/`: revised Claude-based UI preview; production mode keeps real account services disabled.
- `claude-ui/`: original Claude UI versions and assets.
- `claude-premium/`: original alternative UI and assets.
- `course/`: Codex curriculum, generated lessons, portable runtime, tests, and LearnHouse adapter.

Run course checks with `node --test tests/*.test.mjs` inside `course/`, and adapter checks with `node --test integrations/learnhouse/tests/*.test.mjs`. Build the preview with `python3 tools/build-preview.py` inside `demo-preview/`. For browser checks, serve this folder with `python3 -m http.server 8765` and open `/demo-preview/tests/regression.html`.

The preview uses local demo fixtures only; real authentication and LearnHouse persistence require integration. Dependencies are declared in `course/package.json`. Original UI variants are preserved for reference; their old account screens are not production authentication.
