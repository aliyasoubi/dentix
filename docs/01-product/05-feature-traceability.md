# Product Capability Traceability

This matrix links business outcomes to the owning module, release, and acceptance signal. It does not define behavior; detailed requirements remain authoritative.

| Business outcome | Owning module(s) | Release | Acceptance signal |
|---|---|---|---|
| Fast registration and patient retrieval | Patients | R1 | Returning patient is found and opened without duplicate creation |
| Reliable daily scheduling | Scheduling | R2 | Reception completes a fictional day without spreadsheets or silent conflicts |
| Safe clinical documentation | Clinical | R3 | Signed records are immutable and amendments preserve the original |
| Treatment flows to scheduling without re-entry | Treatment Planning, Scheduling | R4 | Procedure, anatomy, provider preference, and duration transfer correctly |
| Long-running care has a visible next action | Treatment Continuity | R4 | Every active journey has an appointment, open task, or reviewed exception |
| Laboratory readiness is visible before delivery visits | Laboratory, Scheduling | R4 | Schedule warns about non-ready dependent lab work and records overrides |
| Patient finance reconciles exactly | Patient Finance | R5 | Ledger, allocations, reversals, receipts, and day close reconcile in rials |
| Patient documents are controlled and reproducible | Documents | R6 | Version, hash, scan state, access, and acknowledgment history are retained |
| Transactional communication is reliable and auditable | Communications | R2/R6 | One intent creates bounded delivery attempts without duplicate sends |
| Complete structured data remains portable | Reporting, all owners | R6 | Authorized export is complete, documented, and audited |
| Farsi/RTL operation is safe and accessible | UI across all modules | R1 onward | Persian critical paths pass RTL, mixed-script, keyboard, and visual tests |
