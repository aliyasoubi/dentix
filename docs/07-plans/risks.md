# Risk Register

Status: living document. Review at every release boundary. Severity = likelihood × impact (H/M/L).

| ID | Risk | L | I | Mitigation | Trigger / early warning | Owner |
|---|---|---|---|---|---|---|
| R-01 | RTL + Angular Material theming proves harder than expected; custom components (scheduler, odontogram, perio grid) misbehave in RTL | M | H | RTL-first development; walking skeleton proves RTL early; visual regression for both directions in CI | RTL bugs found late in component work | Frontend lead |
| R-02 | Jalali/Gregorian adapter defects corrupt dates (leap years, Nowruz, DST history) | M | H | Single tested adapter chosen in ADR-008; round-trip fixture suite; canonical Gregorian/UTC storage means UI bugs never corrupt stored data | Any round-trip test failure | Backend lead |
| R-03 | Sanctions/network restrictions block npm, Docker Hub, cloud services, or foreign SaaS from Iran | H | H | Decide hosting model early (ADR-010); local registry mirror/cache; prefer self-hostable OSS (Keycloak, MinIO, local SMS providers); vendor lock-in review per dependency | Registry/CDN failures during setup | Tech lead |
| R-04 | Single office server = single point of failure; RPO 15 min / RTO 4 h not achievable with chosen hosting | M | H | ADR-010 must state achievable objectives; offsite encrypted backup in separate failure domain; documented degraded-mode (paper fallback) procedures | Restore drill misses targets | Ops owner |
| R-05 | Data migration quality: legacy spreadsheets/paper produce duplicates and wrong balances | H | H | R0 source inventory; dedicated migration spec (02-requirements/09); rehearsal + reconciliation before pilot; parallel ledger run in R5/R7 | Rehearsal reconciliation mismatches | Office manager + dev |
| R-06 | Immutability design flaw discovered after real data exists (amendments/reversals can't express a needed correction) | L | H | Property-based tests in R5; parallel run before cutover; entered-in-error state defined for clinical records | Support cases needing manual DB edits | Backend lead |
| R-07 | Key-person dependency: small team, one office, long roadmap | H | M | Docs-as-code (this repo); ADRs for every decision; runbooks in R6; avoid exotic tech | Bus-factor review at each release | Sponsor |
| R-08 | SMS delivery: Iranian provider requirements (sender IDs, template pre-approval, delivery reliability) delay reminders | M | M | ADR-011 provider selection with fallback; reminders are R2 but not on the critical path of any exit gate; communication history tolerates failed sends | Provider onboarding stalls | Dev |
| R-09 | Scope creep: insurance, accounting, imaging, or multi-location requests reopen excluded domains | H | M | Scope control rule (01-product/03) enforced at planning; exclusion list is contractual | Feature requests referencing excluded domains | Product owner |
| R-10 | Odontogram/perio performance or accessibility fails on office hardware | M | M | Performance budget tests on representative hardware in R3; SVG layer optimization; keyboard-first perio verified early | p95 charting interactions over budget | Frontend lead |
| R-11 | Pilot fatigue: staff run two systems in parallel and disengage | M | H | Keep parallel window short and scoped; train early; visible wins for reception first (R2 order); office manager owns pilot schedule | Declining pilot usage stats | Office manager |
| R-12 | Recommended stack versions (Angular 22 / Node 24 / PG 18) drift or have unpatched issues by build time | L | M | Pin exact patches in repo; normal dependency update process per 01-product/01 | CVE reports; EOL announcements | Tech lead |
| R-13 | No named legal jurisdiction review for patient data (governance requires it before real data) | M | H | Treat legal sign-off as a hard R7 entry gate; track as open item from day one | Pilot date approaches without sign-off | Sponsor |
| R-14 | Persian PDF/print rendering (fonts, shaping, bidi) fails in receipts and clinical printouts | M | M | Print pipeline decided in ADR-009 and proven in walking skeleton; print visual regression suite | First failed bilingual receipt render | Frontend lead |

## Update 2026-08-03 — ADR-012 (Farsi-only UI, Jalali-only presentation)

Changed risk profile:

| ID | Change |
|---|---|
| R-01 | **Reduced.** No runtime RTL/LTR switching and no dual-direction test matrix. RTL-only remains a risk for custom components (scheduler, odontogram, perio grid) — RTL-first development and visual regression stay mandatory. |
| R-02 | **Unchanged.** Jalali-only UI still converts at the boundary to canonical Gregorian/UTC; the round-trip fixture suite remains a release gate. Removing the Gregorian display toggle removes one class of equivalence bug, not the conversion risk. |
| R-14 | **Reduced.** Print pipeline now targets Persian-only templates; still requires shaping/font/bidi proof in the walking skeleton (Latin names appear inside Persian receipts). |
| R-15 | **NEW.** Future need for English UI (foreign patients, investor/partner demos, selling the product to other offices) forces a costly retrofit if hedges erode. L: M, I: M. Internationalization is a stated future direction (ADR-012), so hedges are mandatory and CI-enforced: no hardcoded UI strings (lint rule), CSS logical properties only, locale-neutral backend codes, calendar-adapter interface, IANA timezone in config. Reintroduction of a locale requires a replacement ADR. Owner: Tech lead. |
| R-16 | **NEW.** Mixed-script defects now surface only in production-like data (Latin names, codes, phone numbers embedded in Persian RTL text) since no LTR mode exists to expose them. L: M, I: L. Mitigation: bidi-isolation unit tests with Latin-name fixtures in every list, header, print, and SMS template. Owner: Frontend lead. |
