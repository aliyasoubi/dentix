# Data Migration Requirements

- **Status:** Draft stub — gap identified in design review. The baseline mentions migration only in passing (R0 discovery, R6 import tools) yet migration quality is a top project risk (risks.md R-05). Complete this spec during Release 0 using the source inventory.

## To specify
1. **Sources:** every current data store — spreadsheets, paper records, messaging threads, any legacy software — with format, owner, volume, and quality assessment.
2. **Mapping:** source field → target entity/field for patients, appointments (history), balances, and documents; rules for missing/ambiguous data.
3. **Opening balances:** patient ledger MUST NOT fabricate history — define an explicit opening-balance entry type with source reference, entered as posted immutable entries on a defined cutover business date.
4. **Deduplication:** run the duplicate-scoring engine over imported patients; manual merge queue before go-live.
5. **Validation:** row counts, rejected-row reports, checksum of monetary totals against source, sample-based manual verification signed by the office manager.
6. **Rehearsal:** full migration rehearsal in an isolated environment during R6; reconciliation report is an R7 entry gate.
7. **Cutover:** freeze window, final delta migration, read-only verification of migrated history, rollback plan.
8. **Paper records:** define what is scanned (documents module) vs re-keyed vs left on paper with a reference note.
