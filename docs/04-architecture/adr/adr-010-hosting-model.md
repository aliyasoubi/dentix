# ADR-010: Hosting and Operations Model

- **Status:** Proposed — must be accepted before the walking skeleton deploys
- **Gap identified in design review:** the deployment guide defines environments and sequence but never decides WHERE the system runs or WHO operates it. RPO/RTO targets are meaningless until this is fixed. Sanctions constrain foreign cloud use for an Iranian office.

## Options to evaluate
1. **On-premises office server** + offsite encrypted backup — data stays in office; office must handle hardware failure, UPS, physical security; RTO depends on spare hardware.
2. **Domestic Iranian cloud/VPS** (e.g., local IaaS providers) — professional infrastructure reachable in-country; provider trust and encryption requirements; latency fine.
3. **Hybrid** — production on domestic VPS, encrypted backups both in-office and second provider.

## Decision drivers
Legal residency of patient data, achievable RPO 15 min / RTO 4 h, who is on the hook at 2 a.m., internet reliability at the office (system unusable if office loses connectivity to a remote host — document degraded mode), cost, backup failure-domain separation.

## Decision
_To be recorded, including the named responsible operator and revised, achievable recovery objectives._
