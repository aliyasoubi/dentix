# Design System Specification

> **2026-08-04:** The detailed, implementation-ready design system now lives in `05-ui-design-system.md` (UX-DS-001 v0.2.1, Curve-inspired, revised for ADR-012). This file remains the high-level baseline; where they differ, 05 wins.

## Foundation

Use Angular Material and CDK for accessible primitives, overlays, focus management, drag-and-drop, keyboard behaviors, form controls, and theming. Build a product-specific dental design system above those primitives.

Do not mix PrimeNG, NG-ZORRO, or another full component system with Material.

## Design tokens

Token groups:

  - Color roles: surface, elevated surface, primary action, secondary action, success, warning, danger, information, clinical states, financial states
  - Typography: display, page title, section title, body, label, caption, numeric/tabular
  - Spacing: 4 px base scale
  - Radius: small, medium, large
  - Elevation: flat, raised, overlay
  - Motion: fast, standard, panel
  - Density: comfortable and compact

No domain meaning relies on color alone.

## Component layers

### Layer 1 - Material/CDK primitives

Buttons, inputs, checkbox, radio, select, menus, tooltip, dialog infrastructure, snackbars, tabs where justified, overlay, focus trap, drag-and-drop, virtual scroll.

### Layer 2 - Product components

  - Patient identity header
  - Alert banner
  - Appointment card
  - Status chip with text and icon
  - Timeline
  - Money display and signed amount
  - Bilingual text field
  - Audit-change summary
  - Entity picker

### Layer 3 - Dental components

  - Scheduler
  - SVG odontogram
  - Perio grid
  - Treatment-plan editor
  - Journey stage tracker
  - Follow-up queue
  - Lab readiness card
  - Patient ledger

## Forms

  - Labels remain visible; placeholders are examples, not labels.
  - Required state and validation are explicit.
  - Save actions communicate Draft versus Finalize.
  - Destructive actions use clear verbs and consequences.
  - Long forms use sections and progressive disclosure, not deeply nested accordions.

## Tables and grids

  - Use semantic tables for read-only data.
  - Use ARIA grid patterns only for interactive two-dimensional navigation such as perio entry and selected schedule views.
  - Column headers remain visible where practical.
  - Numeric and currency columns align consistently.
  - Row actions are keyboard accessible and not hidden solely on hover.

## Responsive target

Primary optimization: desktop and laptop. Tablet layouts may adapt side panels to full-screen sheets. Small-phone support is limited to urgent read-only or simple tasks unless a later scope decision expands it.
