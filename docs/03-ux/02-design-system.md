# Design System Entry Point

The authoritative component, token, layout, form, table, motion, RTL, and UI definition-of-done specification is `05-ui-design-system.md`.

Implementation rules:

- Use Angular Material/CDK as the only component foundation.
- Build product and dental components behind typed `Ds*` APIs.
- Use design tokens; domain meaning never depends on color alone.
- Optimize for desktop/laptop and clinically useful tablet layouts.
- Validate keyboard, screen-reader, reduced-motion, zoom, RTL, mixed-script, loading, empty, error, conflict, and permission-denied states.

This file intentionally contains no duplicate token or component catalog.
