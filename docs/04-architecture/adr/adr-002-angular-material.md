# ADR-002: Angular Material/CDK as UI Foundation

- **Status:** Accepted
- **Date:** 2026-08-02

## Decision

Use Angular Material/CDK as the single component and interaction foundation, with a custom dental design system and custom domain components.

## Rationale

  - Maintained with Angular
  - Accessibility and focus primitives
  - Overlay, drag-and-drop, bidi, and form infrastructure
  - Lower upgrade and interaction conflict risk than mixing multiple UI suites

## Consequences

  - Material defaults must be visually customized
  - Scheduler, odontogram, perio grid, journey tracker, and ledger remain custom components
  - PrimeNG and NG-ZORRO components are not mixed into the application shell
