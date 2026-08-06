# Document Control and Authority

The Markdown files under `docs/` are the version-controlled source of truth. There is no separate master document.

| Field | Value |
|---|---|
| Product | Dentix — Farsi-First Single-Office Dental PMS |
| Document version | 0.4.1 |
| Baseline date | 2026-08-06 |
| Product owner | Repository owner until formally delegated |
| Clinical approver | Named dentist before Release 0 exit |
| Operational approver | Named office manager before Release 0 exit |
| Privacy approver | Named legal/privacy reviewer before any real-data processing |

## Authority order

When two documents disagree, the following order applies:

1. **Accepted ADRs** define approved technical and architectural decisions.
2. **Approved requirements** define business behavior and acceptance outcomes.
3. **Architecture and UX specifications** define how approved behavior is implemented.
4. **Quality and operations specifications** define verification and operation.
5. **Release plans, summaries, checklists, and review notes** sequence or summarize work; they do not create requirements.

A lower-authority document must never reinterpret a higher-authority document. Correct the conflict in the same change. Do not leave banners instructing readers to reinterpret stale text.

## Document ownership

| Concern | Authoritative location |
|---|---|
| Product goal, scope, roles | `01-product/` |
| Business behavior | `02-requirements/` |
| Interaction and visual behavior | `03-ux/` |
| Module, data, API, event, and session design | `04-architecture/` |
| Security, tests, acceptance, definition of done | `05-quality/` |
| Deployment, recovery, monitoring, releases | `06-operations/` |
| Work sequence and exit gates | `07-plans/` |

The software design document is an entry point and summary. It never overrides its linked authoritative document.

## Change rules

- A decision that changes an Accepted ADR requires a replacement ADR.
- A business behavior change updates its requirement and acceptance criteria together.
- Architecture changes update the affected context map, data model, API/event contract, and tests in the same change.
- Superseded operational text is removed from active documents; decision history remains in ADRs and Git history.
- Real patient data is prohibited until the Real-Data Authorization Gate in `05-quality/01-security-privacy.md` is approved.
