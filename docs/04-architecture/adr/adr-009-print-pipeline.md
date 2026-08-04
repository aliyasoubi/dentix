# ADR-009: PDF and Print Pipeline

- **Status:** Proposed — must be accepted during Release 0.5
- **Gap identified in design review:** receipts, statements, plans, consents, and reports require bilingual RTL PDFs with embedded Persian fonts, but no generation approach is specified.

## Options to evaluate
1. **Headless Chromium (Puppeteer/Playwright) HTML→PDF** — full CSS bidi/shaping support; reuse web templates; heavier runtime in the worker.
2. **pdfmake / low-level PDF libs** — lighter; RTL shaping and bidi are historically weak; high risk for Persian.
3. **Typst or LaTeX pipeline** — excellent typography; new toolchain and template language for the team.

## Decision drivers
Correct Persian shaping and bidi, font embedding (e.g., Vazirmatn), template versioning with content hashes (consents), visual regression testability, worker resource footprint.

## Decision
_To be recorded after the walking-skeleton dummy receipt proves the chosen route._
