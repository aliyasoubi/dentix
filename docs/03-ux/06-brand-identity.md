# Brand Identity — Dentix

- **Status:** Accepted 2026-08-04
- **Product name:** Dentix

## Name

**Dentix** — a coined Latin-script name (dental + the "-ix" suffix common to precision/tech products). Chosen over the earlier Farsi-meaning candidates (Peyvand, Rahyab, Sarv) because the owner wants a name that travels internationally without requiring translation or meaning-explanation, consistent with the "international later" direction in ADR-012.

Farsi transliteration for UI, print, and verbal use: **دنتیکس** (Dentix, pronounced "den-tiks"). This is a phonetic transliteration, not a translation — it does not carry inherent Farsi meaning, which is expected and fine for a coined tech name.

**Action item:** verify trademark and domain availability for "Dentix" in Iran and relevant future markets before external use (this was not checked as part of this package).

## Logo

Files in `assets/brand/`:

| File | Use |
|---|---|
| `dentix-icon.svg` | App icon, favicon source, avatar |
| `dentix-lockup-en.svg` | Horizontal lockup, LTR contexts (icon left, wordmark right) |
| `dentix-lockup-fa.svg` | Horizontal lockup, RTL contexts (icon right, wordmark right-aligned) — use this in the v1 product per ADR-012 |
| `dentix-icon-monochrome.svg` | Single-color outline variant for watermarks, print, low-color contexts |

### Mark

A rounded-square badge (`--ds-radius-lg`, 14px, matching UX-DS-001 §9.1) containing a bold monogram **D** in `--ds-brand-600` (#187381) on a `--ds-brand-50` (#eef9fa) background, with a small accent dot in `--ds-brand-400` (#48afbe) at the upper right. The dot is a deliberate, restrained nod to the product's core idea — linked records, one connected workflow rather than isolated modules — without resorting to a literal tooth icon, which the design system's personality rules explicitly warn against (UX-DS-001 §3: must not resemble a decorative consumer app or a generic dashboard).

### Construction rules

- Minimum clear space around the mark: half the badge width on all sides.
- Minimum size: 20px (icon alone), 96px width (lockup) — do not scale the wordmark below 12px.
- Do not recolor the mark outside the approved brand and monochrome variants.
- Do not stretch, rotate, or add effects (shadows, gradients, outlines) beyond what is defined here — consistent with UX-DS-001's flat, restrained visual language.
- In RTL layouts (v1 default), use `dentix-lockup-fa.svg` with the icon trailing the wordmark, matching the application shell's RTL mirroring rules (UX-DS-001 §10.3).

### Typography in the mark

- Latin wordmark: Inter, weight 600, per `--ds-font-en`.
- Farsi wordmark: Vazirmatn, weight 700, per `--ds-font-fa`.
- Monogram glyph: Inter, weight 800 (bolder than body type, reserved for the mark only).

## Usage in the product

- Application shell: `dentix-lockup-fa.svg` in the top-left/top-right corner per RTL convention (icon position follows UX-DS-001 §10.2 shell layout).
- Favicon/app icon: exported from `dentix-icon.svg`.
- Printed documents (receipts, statements, consents): `dentix-icon-monochrome.svg` or full-color lockup depending on print capability; always Persian-only in v1 (ADR-012).
- Loading screens, empty states: icon only, no motion applied to the mark itself (avoid decorative animation per UX-DS-001 §23.6).

## Open items

- **[CONFIRM]** Trademark/domain check for "Dentix" — not performed in this package.
- **[CONFIRM]** Final monogram refinement (this is a v1 placeholder mark, not a professionally hand-kerned wordmark) — acceptable for internal tooling and pilot; consider a design pass before any external-facing release (marketing site, App Store-style listing, printed office signage).
