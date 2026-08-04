# Release 0.5 — Walking Skeleton (added; not in the original roadmap)

**Goal:** prove the entire high-risk technical stack end-to-end with one trivial feature before
committing to feature development. Every item here is a known project risk (see risks.md).
**Spec in scope:** 04-architecture/* (all), 03-ux/03-bilingual-rtl-guidelines.md

## Tasks
- [ ] Monorepo scaffold: Angular 22 app + NestJS API + shared types; pinned versions; CI running lint, test, build on every PR
- [ ] Docker-compose dev environment: PostgreSQL 18, Redis, MinIO (S3-compatible), identity provider
- [ ] Decide and record ADR-006: ORM / migration tooling (see adr/adr-006-persistence-tooling.md)
- [ ] Decide and record ADR-007: self-hosted OIDC provider (see adr/adr-007-oidc-provider.md)
- [ ] Decide and record ADR-008: Jalali date adapter library (see adr/adr-008-jalali-adapter.md)
- [ ] One end-to-end slice: login via OIDC → create a "patient" (name in Persian + optional Latin) → stored in Postgres via migration-managed schema → listed with search → audit event written
- [ ] Angular Material theme per UX-DS-001 §24 (Vazirmatn-first typography, density -1) rendering the slice in fa-IR RTL (single locale per ADR-012; strings externalized as a hedge)
- [ ] Storybook running with tokens + first Ds components (UX-DS-001 §28 list starts here: DsStatusChip, DsMoneyDisplay)
- [ ] Startup configuration loader: locale/money config fetched before shell render (UX-DS-001 §2.1)
- [ ] Working Jalali/Gregorian date picker bound to a canonical Gregorian value; round-trip test across Nowruz and a Jalali leap year
- [ ] Rial/toman money input component: toman entry ×10 to canonical integer rial; unit label always rendered
- [ ] One generated PDF (e.g., a dummy receipt) with embedded Persian font, RTL text shaping verified (feeds ADR-009 print pipeline decision)
- [ ] OpenAPI generated from NestJS and consumed to type the Angular client
- [ ] Deploy the skeleton to the target hosting environment once ADR-010 (hosting model) is decided — this validates the ops story early

## Exit criteria
- The slice works deployed, not just locally
- ADR-006 through ADR-010 accepted
- RTL + Jalali + rial/toman components pass their unit and visual tests
- Team agrees no unresolved blocker remains in the stack
