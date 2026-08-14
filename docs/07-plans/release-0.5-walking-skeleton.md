# Release 0.5 — Walking Skeleton (added; not in the original roadmap)

**Goal:** prove the entire high-risk technical stack end-to-end with one trivial feature before
committing to feature development. Every item here is a known project risk (see risks.md).
**Spec in scope:** 04-architecture/* (all), 03-ux/03-bilingual-rtl-guidelines.md, `00-build-sequencing.md` (day-one stack is intentionally smaller than the full architecture)

Detailed evidence, bug write-ups, and proof narrative for every item below live in
`08-implementation/release-0.5-log.md` — this file stays a scannable checklist on purpose.

## Tasks

- [x] Monorepo scaffold: Angular 22 app + NestJS API + shared types; pinned versions; CI running lint, test, build on every PR
- [x] Docker-compose dev environment: PostgreSQL 18 and a development identity provider only — Redis and MinIO are added later, when the first async workflow and document storage respectively actually need them (`00-build-sequencing.md`)
- [ ] Decide and record ADR-006: ORM / migration tooling (see adr/adr-006-persistence-tooling.md)
- [ ] Decide and record ADR-007: self-hosted OIDC provider (see adr/adr-007-oidc-provider.md)
- [x] Decide and record ADR-008: Jalali date adapter library — Accepted (see adr/adr-008-jalali-adapter.md)
- [x] One end-to-end slice: login via OIDC → create a "patient" (name in Persian + optional Latin) → stored in Postgres via migration-managed schema → listed with search → audit event written — proven in a real browser
- [x] Angular Material theme per UX-DS-001 §24 rendering the slice in fa-IR RTL (single locale per ADR-012; strings externalized as a hedge) — three real rendering bugs found via direct user testing and fixed; see the log
- [x] §23 motion tokens, keyboard focus ring (`--ds-focus-ring`), and `prefers-reduced-motion` support — the motion/focus layer was entirely unimplemented; see the log
- [x] Storybook running with tokens + first Ds components (UX-DS-001 §28: `DsStatusChip`, `DsMoneyDisplay`)
- [x] Public bootstrap loader validates fixed Farsi/RTL/Jalali values and configured money unit before shell render
- [x] Working Jalali date picker bound to a canonical Gregorian value; round-trip test across Nowruz and a Jalali leap year
- [x] Rial/toman money input component: toman entry ×10 to canonical integer rial; unit label always rendered
- [x] One generated PDF (e.g., a dummy receipt) with embedded Persian font, RTL text shaping verified (feeds ADR-009 print pipeline decision)
- [x] OpenAPI generated from NestJS and consumed to type the Angular client; live Swagger UI at `/api/docs` (dev/staging only)
- [x] Deploy the skeleton to the target hosting environment once ADR-010 (hosting model) is decided — this validates the ops story early. ADR-010 decided 2026-08-14 (on-prem pattern, Ali's own machine); deployed via the production Compose stack over genuine TLS and proven interactively — real login, MFA enrollment, and a created patient in a real browser, not just health-check curls. See the log.

## Exit criteria

- The slice works deployed, not just locally
- ADR-006 through ADR-010 accepted
- RTL + Jalali + rial/toman components pass their unit and visual tests
- Team agrees no unresolved blocker remains in the stack
