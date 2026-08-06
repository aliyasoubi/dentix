# Product Identity Assets

This document defines only the identity assets used by the application and generated documents. Marketing, trademark, domain, and commercial-brand work is outside the implementation package.

## Product name

- Latin name: **Dentix**
- Farsi display name: **دنتیکس**

## Assets

| File | v1 use |
|---|---|
| `assets/brand/dentix-icon.svg` | Favicon source, application icon, compact loading state |
| `assets/brand/dentix-lockup-fa.svg` | Farsi/RTL application shell and color documents |
| `assets/brand/dentix-icon-monochrome.svg` | Receipts, statements, consents, watermarks, and low-color print |
| `assets/brand/dentix-lockup-en.svg` | Reserved asset; excluded from the Farsi-only v1 application bundle |

## Implementation rules

- Use the design-system brand tokens; do not duplicate raw colors in feature code.
- Keep minimum icon size at 20 px and lockup width at 96 px.
- Preserve aspect ratio, clear space, and approved color/monochrome variants.
- Do not add shadows, gradients, rotation, or decorative animation.
- The RTL shell uses `dentix-lockup-fa.svg`; dental anatomy and chronology are unaffected by logo direction.
- Generated documents use the Farsi lockup or monochrome icon and remain subject to the print visual-regression suite.
