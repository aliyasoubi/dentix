# Consolidated Non-Functional Requirements

- **Status:** Draft stub — gap identified in design review. Targets below collect values scattered across the baseline plus proposed values (marked NEW) that the office must confirm during Release 0.

## Performance (existing)
Schedule open p95 < 2 s; drag feedback < 100 ms; conflict response p95 < 500 ms; registration+scheduling of returning patient < 45 s; charting a common restoration ≤ 10 interactions.

## Capacity assumptions (NEW — confirm with office)
Concurrent users: ~5–15. Patients: assume 10k–50k lifetime records. Appointments: ~30–80/day. Documents: estimate GB/year for storage sizing. Ten-year retention horizon for sizing.

## Availability (existing + NEW)
Business-hours reliability for one office; documented degraded modes. NEW: define office hours window, acceptable planned-maintenance windows, and paper-fallback procedure when the system is unreachable.

## Client environment (NEW — the baseline never defines the browser matrix)
Supported browsers and minimum versions, minimum screen resolution, office network characteristics, printer models for receipts/documents, scanner input path.

## Data retention (existing pointer)
Configurable per law and office policy — actual retention periods must be set with legal review (R7 gate).

## Recovery (existing, contingent on ADR-010)
RPO 15 min / RTO 4 h starting targets; revise once hosting model is decided.
