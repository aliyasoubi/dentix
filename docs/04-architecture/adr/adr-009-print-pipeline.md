# ADR-009: PDF and Print Pipeline

- **Status:** Proposed — accept via the acceptance checklist below
- **Constraint:** receipts, statements, plans, consents, and reports require Persian RTL PDFs with embedded fonts, correct mixed-script rendering, and font embedding (e.g., Vazirmatn) with content-hash template versioning for consents.

## Recommended decision

**Headless Chromium (Playwright) HTML→PDF, rendered in the worker process.**

- Templates are versioned HTML/CSS sharing the design-system tokens; Vazirmatn embedded via `@font-face` with no network fetch at render time.
- Chromium's CSS bidi/shaping engine is the same one already trusted for the RTL web UI — one rendering behavior to test, and receipt templates get visual-regression coverage with the same tooling as screens.
- Rendering runs only in the worker with a per-job timeout and memory cap; generated PDFs land in object storage with a content hash (consent reproducibility).
- pdfmake/low-level PDF libraries are rejected for Persian shaping risk; Typst/LaTeX rejected as a second template toolchain for one team.

## Implementation note (S7): a real non-determinism Chromium introduces, and the fix

Two renders of byte-identical HTML did not produce byte-identical PDFs: Skia (Chromium's PDF backend) stamps the current wall-clock time into the `/CreationDate` and `/ModDate` entries of the PDF's Info dictionary on every render, and nothing else varied — verified by diffing two raw PDF buffers directly, which found exactly two single-byte differences, both inside those two 14-digit timestamps. Left alone, this would have silently broken the "content hash identical across two renders" requirement for a reason with nothing to do with the actual document content. `PlaywrightPdfRendererAdapter` (`apps/worker/src/modules/documents/infrastructure/`) now overwrites both timestamps with a fixed placeholder of the same character length after every render, before the bytes are hashed or uploaded — a same-size in-place patch on plain-text dictionary entries (confirmed not inside a compressed stream), so it cannot shift any byte offset the PDF's own xref table depends on. Proven by an integration test that renders the identical fixture twice and asserts the PDF bytes themselves are `.equals()`, not just the hash.

## Acceptance checklist (Release 0.5 proofs)

- [x] Dummy receipt fixture (Persian text, Latin name, Persian digits, rial and toman labels, Jalali date) renders with correct shaping and ordering — human-reviewed once, then frozen as a visual-regression baseline. *(S7: `apps/worker/src/modules/documents/domain/receipt-fixture.ts` + `receipt-template.ts`, using `@dentix/kernel`'s Jalali (S5) and Money (S6) formatting directly — not a second, divergent print implementation. Rendered against real headless Chromium (not mocked) and reviewed: نام بیمار (فارسی) renders رضا احمدی with correctly connected Vazirmatn letterforms (proving the embedded font actually loaded, not a fallback); نام بیمار (لاتین) renders Reza Ahmadi left-to-right inside the RTL page without mirroring; the receipt number RC-0001 stays LTR as a code/identifier rather than having its digits converted to Persian; تاریخ shows ۱۴۰۴/۱۰/۰۱ (Dey 1, 1404 — the same ICU-cross-validated fixture already frozen in `packages/kernel/src/jalali.spec.ts`); مبلغ قابل پرداخت shows ۲٬۵۰۰٬۰۰۰ تومان, grouped and tabular. This rendered PDF is the frozen visual-regression baseline.)*
- [ ] Render inside the worker container on the ADR-010 host within the timeout/memory budget. *(S7: proven inside a real container shape — `--no-sandbox` Chromium launch args (needed only for containerized/CI environments) and a CI step installing Chromium's OS dependencies on a bare Ubuntu runner — and comfortably inside the 30s per-job timeout on real hardware. Not yet proven on an actual deployed ADR-010 host, because ADR-010 itself is still undecided; this item stays open until hosting is.)*
- [x] Content hash recorded and identical across two renders of the same template version + data. *(S7: see the implementation note above. `apps/worker/test/integration/render-receipt.int-spec.ts` renders the fixture twice against real Chromium and asserts identical SHA-256 hashes, identical object-storage keys, and byte-identical PDFs — plus a control case proving the hash changes when the underlying data does. Also proven: real upload to and byte-for-byte download from MinIO, not a storage mock.)*
