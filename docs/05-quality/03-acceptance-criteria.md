# Cross-Product Acceptance Criteria

> **Scope change 2026-08-03 (ADR-012):** v1 is Farsi-only, RTL-only, Jalali-only presentation. Read every "Persian and English" / "RTL/LTR" / "Jalali/Gregorian presentation" requirement in this file as Persian / RTL / Jalali for the UI. Canonical Gregorian/UTC storage rules are unchanged. English-specific items are deferred until a replacement ADR reintroduces a second locale.

## Patient and search

  - User can register a patient with Persian-only, English-only, or both names.
  - Search normalizes common Persian/Arabic character variants without altering displayed data.
  - Duplicate warning appears for configured high-confidence matches.
  - Equivalent 09..., +98..., and Persian-digit Iranian mobile forms resolve to the same canonical search value.
  - Optional national-code validation does not block a patient whose identifier is unavailable.

## Scheduling

  - Conflicting appointments are blocked or explicitly overridden with a reason.
  - Every status transition appears in appointment history.
  - Planned appointments and no-shows create actionable follow-up items according to configuration.
  - Lab-dependent appointments display readiness and risk warnings.
  - The same appointment entered in Jalali mode and viewed in Gregorian mode retains the identical stored instant in Asia/Tehran.
  - Configured Iranian holidays and office closures are visible and enforced by scheduling policy.

## Clinical

  - Patient identity and critical alerts remain visible during charting.
  - Signed notes cannot be edited; amendment retains original.
  - Tooth/surface mapping is correct in both numbering systems.
  - Procedure completion links to encounter, plan, journey, and optional draft charge.

## Treatment continuity

  - A journey displays current stage, timeline, next action, future appointment, and open tasks.
  - Follow-up Center identifies active journeys with no next action.
  - Implant and ortho templates use the shared journey model.
  - Lab order revision and readiness history are retained.

## Finance

  - Posted entries cannot be updated or deleted.
  - Reversal produces exact balancing result.
  - Day-end report reconciles to ledger data.
  - Receipts print correctly in Persian (v1's only shipped template language, per ADR-012).
  - All money fields and outputs explicitly label rial or toman.
  - Entering a toman amount produces the exact expected canonical rial value and all ledger/report totals reconcile in rials.

## Security

  - Unauthorized identifier access is denied and logged appropriately.
  - MFA and session revocation work.
  - Sensitive exports create audit events.
  - Production logs contain no known patient content in tested scenarios.

## UX

  - All critical actions are keyboard accessible.
  - Reduced-motion setting is honored.
  - Critical pages pass supported browser zoom and RTL/LTR visual checks.
  - Critical date and print screens pass both Jalali and Gregorian presentation checks.
  - Common workflow interaction budgets are met or exceptions approved.
