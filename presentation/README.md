# Client presentation

`deck.html` is the source of `Valley-Pawn-Proposal.pdf` (12 slides, 16:9). Screenshots in `img/`
come from the showcase preview (`npm run dev:demo`). `sample-import.csv` is the file used for the
import-preview and history screenshots.

Retake the screenshots from a running demo (`npm run dev:demo`), then re-render. Both need
Playwright; `capture.cjs` drives installed Google Chrome. For `render.cjs`, either install Playwright's
Chromium (`npx playwright install chromium`) or change its launch call to `chromium.launch({ channel: 'chrome' })`.
```bash
cd valley-pawn/presentation && node capture.cjs http://localhost:5173 img sample-import.csv
```
Re-render after editing:

```bash
cd valley-pawn/presentation && node render.cjs deck.html Valley-Pawn-Proposal.pdf
```
