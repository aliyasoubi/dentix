# Release 0.5 — Walking Skeleton (added; not in the original roadmap)

**Goal:** prove the entire high-risk technical stack end-to-end with one trivial feature before
committing to feature development. Every item here is a known project risk (see risks.md).
**Spec in scope:** 04-architecture/* (all), 03-ux/03-bilingual-rtl-guidelines.md, `00-build-sequencing.md` (day-one stack is intentionally smaller than the full architecture)

## Tasks
- [ ] Monorepo scaffold: Angular 22 app + NestJS API + shared types; pinned versions; CI running lint, test, build on every PR
- [ ] Docker-compose dev environment: PostgreSQL 18 and a development identity provider only — Redis and MinIO are added later, when the first async workflow and document storage respectively actually need them (`00-build-sequencing.md`)
- [ ] Decide and record ADR-006: ORM / migration tooling (see adr/adr-006-persistence-tooling.md)
- [ ] Decide and record ADR-007: self-hosted OIDC provider (see adr/adr-007-oidc-provider.md)
- [x] Decide and record ADR-008: Jalali date adapter library (see adr/adr-008-jalali-adapter.md) *(S5: Accepted — jalaali-js for kernel's pure conversions, date-fns-jalali scoped to the Material adapter; see the ADR's implementation note.)*
- [x] One end-to-end slice: login via OIDC → create a "patient" (name in Persian + optional Latin) → stored in Postgres via migration-managed schema → listed with search → audit event written *(S4: proven in a real browser — real Keycloak login with MFA, patient created with a Persian native name + Latin name + phone, found again by phone in all three accepted forms (09…, +98…, Persian digits) and by a partial name typed with the Arabic Yeh variant, RTL layout correct throughout, session survives a hard reload, logout ends both the local and Keycloak SSO session.)*
- [ ] Angular Material theme per UX-DS-001 §24 (Vazirmatn-first typography, density -1) rendering the slice in fa-IR RTL (single locale per ADR-012; strings externalized as a hedge)
- [ ] Storybook running with tokens + first Ds components (UX-DS-001 §28 list starts here: DsStatusChip, DsMoneyDisplay)
- [ ] Public bootstrap loader validates fixed Farsi/RTL/Jalali values and configured money unit before shell render
- [x] Working Jalali date picker bound to a canonical Gregorian value; round-trip test across Nowruz and a Jalali leap year *(S5: `JalaliDateAdapter` wired into the S4 patient form's date-of-birth field; kernel's 33-fixture suite plus 14 adapter unit tests plus a real-browser human check — picked فروردین ۱۴۰۳/۱ (Nowruz, a leap year) via the picker, submitted, and it round-tripped back through Postgres and the API as ۱۴۰۳/۰۱/۰۱ in the search results.)*
- [ ] Rial/toman money input component: toman entry ×10 to canonical integer rial; unit label always rendered
- [ ] One generated PDF (e.g., a dummy receipt) with embedded Persian font, RTL text shaping verified (feeds ADR-009 print pipeline decision)
- [ ] OpenAPI generated from NestJS and consumed to type the Angular client
- [ ] Deploy the skeleton to the target hosting environment once ADR-010 (hosting model) is decided — this validates the ops story early

## Exit criteria
- The slice works deployed, not just locally
- ADR-006 through ADR-010 accepted
- RTL + Jalali + rial/toman components pass their unit and visual tests
- Team agrees no unresolved blocker remains in the stack
