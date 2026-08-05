# Motion and Accessibility Guidelines

> **Scope change 2026-08-03 (ADR-012):** v1 is Farsi-only, RTL-only, Jalali-only presentation. Read every "Persian and English" / "RTL/LTR" / "Jalali/Gregorian presentation" requirement in this file as Persian / RTL / Jalali for the UI. Canonical Gregorian/UTC storage rules are unchanged. English-specific items are deferred until a replacement ADR reintroduces a second locale.

## Motion goals

Motion communicates continuity, state change, and location. It must not slow clinical work or decorate dense screens unnecessarily.

## Timing tokens

  - Immediate feedback: 80-120 ms
  - Menu or tooltip: 120-160 ms
  - Row insertion/removal: 160-220 ms
  - Side panel: 180-220 ms
  - Dialog: 180-240 ms
  - Large route transitions: generally none

Prefer opacity and transform. Avoid expensive layout animation.

## Examples

### Appointment drag

  - Show lightweight placeholder.
  - Highlight valid target.
  - Explain invalid target immediately.
  - Commit only after server validation.
  - Restore prior position on conflict with a clear message.

### Follow-up completion

  - Immediate checkbox feedback.
  - Brief confirmation.
  - Move row after state is persisted.
  - Offer undo only where domain rules permit.

### Patient navigation

Keep patient header stable and replace the content region without sweeping full-page transitions.

## Reduced motion

Honor prefers-reduced-motion. Functional feedback must remain available without movement.

## Accessibility baseline

  - Target WCAG 2.2 AA for supported workflows.
  - Full keyboard operation for critical tasks.
  - Visible focus indicator.
  - Semantic headings and landmarks.
  - Accessible names for icon buttons.
  - Status represented by text/icon, not only color.
  - Dialog focus is trapped and returned correctly.
  - Error summaries link to invalid fields.
  - Screen-reader labels for odontogram teeth/surfaces and perio cells.
  - Minimum target sizes appropriate for clinical desktop/tablet use.

## Accessibility testing

  - Automated axe checks in component and end-to-end tests
  - Keyboard-only acceptance scenarios
  - Screen-reader smoke tests in English and Persian
  - High-contrast and zoom testing
  - Reduced-motion testing
  - Manual verification of custom SVG and grid components
