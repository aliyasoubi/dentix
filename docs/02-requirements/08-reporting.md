# Fixed Reporting Requirements

## Principle

The first product provides curated fixed reports with documented definitions. It does not provide a custom report builder.

## Scheduling reports

  - Daily schedule

  - Appointments by status

  - Cancellation and no-show analysis

  - Provider and operatory utilization

  - Waitlist

  - Planned appointments not scheduled

  - Recall due and overdue

## Clinical and treatment reports

  - Completed procedures

  - Unsigned encounters and incomplete notes

  - Proposed and accepted treatment

  - Accepted treatment without a future appointment

  - Active journeys by stage

  - Journeys without next action

  - Implant maintenance due

  - Ortho reviews overdue

  - Follow-up tasks overdue

  - Lab orders due, delayed, or not ready for booked appointment

## Financial reports

  - Daily charges

  - Daily collections by method

  - Refunds, reversals, discounts, and adjustments

  - Provider production

  - Patient balances

  - Aged patient receivables

  - Day-end reconciliation

## Administrative and security reports

  - New and inactive patients

  - User activity

  - Sensitive record amendments

  - Patient exports

  - Permission changes

  - Failed authentication and suspicious session events

## Report requirements

  - Date/time interpretation uses Asia/Tehran office timezone and business-date rules. Reports support Jalali and Gregorian presentation without changing inclusion logic.

  - Report definitions include inclusion, exclusion, and status logic.

  - Financial reports support exact reconciliation to ledger entries.

  - Exports follow permission rules and create audit events.

  - Persian and English column labels are available.

  - Printed and exported reports declare the calendar system used for displayed dates.

  - Every financial report declares rial or toman in its title/header and is calculated from canonical rial values.

  - Large reports run asynchronously and notify the user when ready.
