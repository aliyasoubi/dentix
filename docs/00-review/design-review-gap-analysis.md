# Architecture Readiness Review

**Baseline:** 0.4.1 — 2026-08-06

## Resolved in this baseline

- Document authority and conflict resolution are defined in `document-control.md`.
- Active specifications align with ADR-012: Farsi-only, RTL-only, Jalali-only presentation.
- Bounded contexts map to owned NestJS modules in `04-architecture/07-context-module-map.md`.
- Cross-module transactions, events, process managers, retries, and reconciliation are defined in `04-architecture/08-transaction-event-semantics.md`.
- The logical data model defines ownership, relationships, invariants, immutability, concurrency, and core constraints.
- The browser uses the accepted OIDC-backed BFF session in `04-architecture/09-authentication-session-architecture.md`.
- The Real-Data Authorization Gate applies before any real-data extract, migration rehearsal, or parallel ledger.
- ADR-006…011 now have drafted recommended decisions with acceptance checklists (`04-architecture/adr/`); acceptance is gated on their walking-skeleton proofs.
- An execution layer exists for AI-assisted implementation: `08-implementation/01-workflow.md` (slice TDD loop, test layers, verification commands) and per-release slice files.
- Entry-point/authoritative duplication removed: topology, module layout, use-case pattern, stack, and release tables each live in exactly one owning document; summaries reference them.

## Decisions still required before the walking skeleton exits

1. ADR-006 — persistence and migration tooling. *Drafted (TypeORM, migration-only); accept via checklist.*
2. ADR-007 — self-hosted OIDC provider. *Drafted (Keycloak); accept via checklist.*
3. ADR-008 — Jalali adapter/library proven by shared fixtures. *Drafted (date-fns-jalali behind one adapter); accept via checklist.*
4. ADR-009 — Persian PDF/print pipeline proven by a rendered receipt. *Drafted (Playwright HTML→PDF); accept via checklist.*
5. ADR-010 — hosting/operations model and named operator. *Drafted (single-host Compose, domestic VPS or on-prem); host pattern + operator still open.*

ADR-011 (messaging provider — drafted, Kavenegar/SMS.ir/Melipayamak shortlist) is required before production messaging setup.

## Scope decisions recorded this baseline

- **Inventory/stock management: deferred to a future version** (product-owner decision, 2026-08-06). The existing standalone inventory backend continues as a separate system; the future path is an `inventory` module per the deferred list in `01-product/03-scope-and-exclusions.md`. No inventory work inside Dentix v1.
- **Insurance/claims: remains excluded from v1**, reclassified as deferred-for-future-evaluation rather than permanently rejected.

## Discovery outputs still required

- Stable requirement IDs and requirement-to-test traceability.
- Confirmed browser, hardware, printer, scanner, network, volume, storage, and office-hours assumptions.
- Approved Iranian holiday source and annual update owner.
- Complete migration mapping and rejection/reconciliation rules after source inventory.
- Named product, clinical, operational, privacy, and technical approvers.

## Build gate

Release 1 feature development starts only after Release 0 discovery and the deployed Release 0.5 walking skeleton satisfy their exit criteria. Real patient data remains prohibited until the separate Real-Data Authorization Gate is approved.
