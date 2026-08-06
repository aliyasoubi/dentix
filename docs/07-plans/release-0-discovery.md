# Release 0 — Discovery and Prototype

**Goal:** validate workflows, terminology, and screen concepts with the real office before any production code.
**Spec in scope:** 01-product/* (all), 03-ux/01-information-architecture.md, 03-ux/02-design-system.md

## Tasks
- [ ] Shadow reception, assistant, dentist, and manager for at least one full working day each; write workflow notes
- [ ] Confirm Persian terminology (plus retained Latin name field) for every glossary term with the dentist (gate: dentist approval)
- [ ] Inventory current data sources for migration: spreadsheets, paper forms, messaging apps, any legacy software — record formats, volumes, and quality issues
- [ ] Build code-first prototype in Storybook (per UX-DS-001 §5 — no Figma): patient header, day schedule, odontogram, Follow-up Center, ledger — in Persian RTL; stories double as the start of the production component library
- [ ] Walk each role through the prototype for their own workflows; record friction
- [ ] Agree the permission matrix (01-product/04) and retention rules with the office manager
- [ ] Draft migration source map and data-quality risk list (feeds risks.md)
- [ ] Name the privacy approver and document the jurisdiction/hosting questions required by the Real-Data Authorization Gate; do not copy patient content during discovery

## Exit criteria
- Prototype approved by dentist, receptionist, assistant, and office manager
- Terminology sheet signed off in Persian
- Migration source inventory documented
- Real-data gate owner and approval path documented
