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

### Administration

  - report.view-clinical

  - report.view-financial

  - audit.view

  - user.manage

  - permission.manage

  - configuration.manage

  - backup.manage

## Authorization rules

22. Endpoint authorization and object-level authorization are both required.

23. A user must not gain access merely by guessing an identifier.

24. Clinical signing requires an eligible provider identity and recent authentication.

25. Financial reversals and refunds require a reason; policy may require office-manager approval.

26. Patient export is a sensitive event and is always audited.

27. System administrators do not automatically receive clinical access.

28. Disabled users retain authorship history but cannot authenticate.

29. Permission changes take effect promptly and create audit events.

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
