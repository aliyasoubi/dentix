# ADR-009: PDF and Print Pipeline

- **Status:** Proposed — accept via the acceptance checklist below
- **Constraint:** receipts, statements, plans, consents, and reports require Persian RTL PDFs with embedded fonts, correct mixed-script rendering, and font embedding (e.g., Vazirmatn) with content-hash template versioning for consents.

## Recommended decision

**Headless Chromium (Playwright) HTML→PDF, rendered in the worker process.**

- Templates are versioned HTML/CSS sharing the design-system tokens; Vazirmatn embedded via `@font-face` with no network fetch at render time.
- Chromium's CSS bidi/shaping engine is the same one already trusted for the RTL web UI — one rendering behavior to test, and receipt templates get visual-regression coverage with the same tooling as screens.
- Rendering runs only in the worker with a per-job timeout and memory cap; generated PDFs land in object storage with a content hash (consent reproducibility).
- pdfmake/low-level PDF libraries are rejected for Persian shaping risk; Typst/LaTeX rejected as a second template toolchain for one team.

## Acceptance checklist (Release 0.5 proofs)

- [ ] Dummy receipt fixture (Persian text, Latin name, Persian digits, rial and toman labels, Jalali date) renders with correct shaping and ordering — human-reviewed once, then frozen as a visual-regression baseline.
- [ ] Render inside the worker container on the ADR-010 host within the timeout/memory budget.
- [ ] Content hash recorded and identical across two renders of the same template version + data.
