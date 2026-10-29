# Client presentation

`deck.html` is the source of `Valley-Pawn-Proposal.pdf` (11 slides, 16:9). Screenshots in `img/`
come from the showcase preview (`npm run dev:demo`). `sample-import.csv` is the file used for the
import-preview and history screenshots.

Re-render after editing (needs Playwright with Chromium):

```bash
cd valley-pawn/presentation && node render.cjs deck.html Valley-Pawn-Proposal.pdf
```
