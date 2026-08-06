# Risk Register

Review this register at every release boundary. Severity is likelihood × impact.

| ID | Risk | L | I | Mitigation | Trigger | Owner |
|---|---|---|---|---|---|---|
| R-01 | Custom scheduler, odontogram, or perio components misbehave in RTL | M | H | RTL-first Storybook and visual/keyboard tests in the walking skeleton | RTL defects found after feature integration | Frontend lead |
| R-02 | Jalali conversion defects corrupt displayed or entered dates | M | H | One adapter; shared leap-year/Nowruz/timezone fixtures; canonical Gregorian/UTC storage | Any round-trip mismatch | Tech lead |
| R-03 | Sanctions/network restrictions block registries, cloud, or foreign SaaS | H | H | Decide ADR-010 early; cache dependencies; prefer self-hostable/runtime-local services | Setup or production dependency unreachable from Iran | Tech lead |
| R-04 | Hosting cannot achieve RPO 15 minutes/RTO 4 hours | M | H | Accepted hosting/operator model, separate failure-domain backup, restore drills, downtime procedure | Restore misses target | Ops owner |
| R-05 | Migration creates duplicate patients or incorrect balances | H | H | Source inventory, field mapping, dedup queue, authorized rehearsal, monetary reconciliation, controlled cutover | Rehearsal mismatch/rejected-row spike | Office manager + developer |
| R-06 | Amendment/reversal model cannot express a required correction | L | H | Domain examples and property tests before real data; controlled parallel verification | Request for manual database edit | Clinical/finance approvers |
| R-07 | Single-developer dependency delays delivery or recovery | H | M | Small stack, docs-as-code, automated builds, ADRs, runbooks, tested restore | No alternate operator can follow runbook | Product owner |
| R-08 | Iranian messaging-provider registration or delivery is delayed | M | M | ADR-011, early sender/template registration, bounded retry/fallback, manual contact queue | Provider onboarding or delivery SLA fails | Developer |
| R-09 | Insurance, accounting, imaging, AI, or multi-location requests expand scope | H | M | Enforce scope-control rule and measurable release outcome | Request reintroduces excluded domain | Product owner |
| R-10 | Odontogram/perio performance or accessibility fails on office hardware | M | M | R3 performance/keyboard tests on the approved hardware baseline | Interaction budget or accessibility test fails | Frontend lead |
| R-11 | Staff disengage during parallel operation | M | H | Short authorized pilot window, training, reception-first wins, daily issue triage | Declining usage or unreconciled paper work | Office manager |
| R-12 | Pinned Angular/Node/PostgreSQL versions drift or gain critical CVEs | L | M | Exact patch pins, automated scanning, scheduled update review | Security advisory or approaching EOL | Tech lead |
| R-13 | Privacy/legal approval is unavailable before real-data work | M | H | Name approver in R0; close Real-Data Authorization Gate before any extract, R5 parallel ledger, or R6 rehearsal | Any request to copy patient data without written scope approval | Product owner |
| R-14 | Persian PDF shaping, font embedding, or mixed-script bidi fails | M | M | Prove ADR-009 with receipt/consent fixtures and visual regression | Print fixture changes shape, clips, or reorders text | Frontend lead |
| R-15 | Future locale work becomes a rewrite because boundaries erode | M | M | Externalized strings, CSS logical properties, locale-neutral APIs, calendar/number adapters, architecture linting | Hardcoded Farsi or direction-dependent domain logic | Tech lead |
| R-16 | Latin names/codes/phones render incorrectly inside RTL content | M | M | Bidi-isolation utilities and mixed-script fixtures in UI, print, and messages | Misordered or ambiguous identifier | Frontend lead |
