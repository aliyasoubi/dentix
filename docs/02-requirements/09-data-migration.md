# Data Migration Requirements

- **Status:** Requires Release 0 source inventory before field-level mapping can be approved.

The Real-Data Authorization Gate in `05-quality/01-security-privacy.md` applies before any patient content is copied or processed. Release 0 may record source names, owners, formats, approximate volumes, and observed quality without extracting patient data.

## To specify
1. **Sources:** every current data store — spreadsheets, paper records, messaging threads, any legacy software — with format, owner, volume, and quality assessment.
2. **Mapping:** source field → target entity/field for patients, appointments (history), balances, and documents; rules for missing/ambiguous data.
3. **Opening balances:** patient ledger MUST NOT fabricate history — define an explicit opening-balance entry type with source reference, entered as posted immutable entries on a defined cutover business date.
4. **Deduplication:** run the duplicate-scoring engine over imported patients; manual merge queue before go-live.
5. **Validation:** row counts, rejected-row reports, checksum of monetary totals against source, sample-based manual verification signed by the office manager.
6. **Rehearsal:** after real-data authorization, rehearse the minimum authorized extract in an isolated environment during R6; reconcile and delete the rehearsal copy according to the approved plan.
7. **Cutover:** freeze window, final delta migration, read-only verification of migrated history, rollback plan.
8. **Paper records:** define what is scanned (documents module) vs re-keyed vs left on paper with a reference note.
