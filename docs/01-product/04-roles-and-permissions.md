# Roles and Permissions

## Default roles

The system does not assume a hygienist position. Roles are templates for capabilities, not hard-coded clinical professions.

| **Role**             | **Primary responsibility**                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Dentist              | Examination, diagnosis, treatment planning, procedures, finalization, and amendments            |
| Dental assistant     | History preparation, chairside draft documentation, lab work, documents, and assigned follow-up |
| Receptionist         | Registration, scheduling, confirmations, recall, waitlist, and patient contact                  |
| Cashier              | Payments, receipts, approved discounts, refunds, and day-end preparation                        |
| Office manager       | Operational oversight, reports, schedule controls, financial approval, and user supervision     |
| System administrator | Accounts, permissions, security configuration, integrations, and recovery operations            |

One person may hold multiple roles. A role grants a starting permission set; individual exceptions must be visible and auditable.

## Permission families

### Patient

  - patient.view
  - patient.create
  - patient.edit-demographics
  - patient.merge
  - patient.export
  - patient.view-sensitive-alerts

### Scheduling

  - appointment.view
  - appointment.create
  - appointment.reschedule
  - appointment.cancel
  - appointment.override-conflict
  - schedule.manage-availability

### Clinical

  - clinical.view
  - clinical.encounter.create
  - clinical.note.edit-draft
  - clinical.note.sign
  - clinical.note.amend
  - clinical.odontogram.edit
  - clinical.perio.edit
  - clinical.procedure.complete

### Treatment

  - treatment-plan.create
  - treatment-plan.present
  - treatment-plan.record-decision
  - journey.manage
  - follow-up.assign
  - lab-order.manage

### Finance

  - ledger.view
  - ledger.post-charge
  - ledger.post-payment
  - ledger.discount
  - ledger.refund
  - ledger.reverse
  - ledger.day-end-close

### Documents and communications

  - document.view
  - document.upload
  - document.view-sensitive
  - document.delete
  - communication.send
  - communication.view-history

### Administration

  - report.view-clinical
  - report.view-financial
  - audit.view
  - user.manage
  - permission.manage
  - configuration.manage
  - backup.manage

## Authorization rules

1. Endpoint authorization and object-level authorization are both required.
2. A user must not gain access merely by guessing an identifier.
3. Clinical signing requires an eligible provider identity and recent authentication.
4. Financial reversals and refunds require a reason; policy may require office-manager approval.
5. Patient export is a sensitive event and is always audited.
6. System administrators do not automatically receive clinical access.
7. Disabled users retain authorship history but cannot authenticate.
8. Permission changes take effect promptly and create audit events.

## Default permission examples

| **Capability**            | **Dentist**             | **Assistant** | **Reception** | **Cashier**  | **Manager**  | **Admin**       |
| ------------------------- | ----------------------- | ------------- | ------------- | ------------ | ------------ | --------------- |
| View patient demographics | Yes                     | Yes           | Yes           | Yes          | Yes          | Configurable    |
| Edit demographic data     | Yes                     | Yes           | Yes           | Limited      | Yes          | No by default   |
| Sign clinical note        | Yes                     | No            | No            | No           | If dentist   | No              |
| Edit perio draft          | Yes                     | Configurable  | No            | No           | If clinician | No              |
| Manage lab order          | Yes                     | Yes           | View          | No           | Yes          | No              |
| Post payment              | View                    | No            | Configurable  | Yes          | Yes          | No              |
| Refund payment            | No                      | No            | No            | Configurable | Yes          | No              |
| View audit log            | Limited patient history | No            | No            | No           | Yes          | Security events |

## Separation of duty

DISC-003 asks for this alongside the matrix above, and it is a genuinely different kind of
decision: the matrix says who *can* do something at all; separation of duty says which of those
capabilities must not rest entirely on one person's judgment, no matter their role. It applies
narrowly — money handling and access control, the two areas separation-of-duty controls
conventionally exist for — not to clinical scope-of-practice (`Configurable` cells like "Edit
perio draft" above are a delegation decision, not a fraud/error-control one, and stay out of this
section on purpose).

**One rule needs no office-specific input and is asserted here rather than left as a question:**
nobody approves their own transaction. Whatever the refund/discount threshold ends up being, the
person who initiated a payment, discount, or refund must not also be the one whose approval
satisfies the office-manager-approval requirement on it, even if they hold the Manager role
through the "one person may hold multiple roles" allowance above. A single-manager office does not
get an exception to this rule — it gets a queue: the transaction waits for a second eligible
approver rather than self-approving, the same way a disabled user retains history but cannot
authenticate (rule 7) rather than the rule bending to fit a headcount of one.

**Decided (2026-08-14, Ali):**

- Reception posts payments by default (`Post payment` / Reception = On), matching an office where
  the front desk also collects payment, not only the dedicated Cashier role.
- Refund, discount, and reversal **all require approval on every transaction, with no rial or
  percentage threshold for now** — Ali considered setting real figures for each and chose the
  simpler rule instead: `refund-approval-threshold`, `discount-approval-threshold`, and
  `reversal-approval-threshold` all start at 0 (effectively "always"). They stay Layer 2
  office-configurable values, not migration-time constants, precisely so this office can raise
  them later once real transaction data exists to tune against — today's default is deliberately
  the strict one, not the permanent one.
- **Eligible approvers are Manager or System Administrator**, not Manager alone. Worth stating
  explicitly since it's a departure from the `Default permission examples` table above, where
  `Refund payment` shows Admin as `No` — that cell is about who can *initiate* a refund
  unsupervised (still no), not who can satisfy the approval step this section adds. Not in tension
  with rule 6 ("system administrators do not automatically receive clinical access"): that rule is
  scoped to clinical access specifically, and financial approval is a separate grant this section
  makes on its own terms.

`discount-approval-threshold` is explicitly confirmed configurable (Ali: "also configurable") —
the same as the other two, stated here because it was asked about by name.
