# Product Vision

## Vision statement

Create the simplest trustworthy bilingual dental PMS for one office: fast enough for reception, clinically safe enough for dentists, transparent enough for management, and maintainable enough for a long-lived engineering product.

## Target office

  - One physical office in the domestic Iranian operating profile
  - One or more dentists
  - Dental assistants
  - Reception and office-management staff
  - Optional cashier role
  - No insurance workflow in the first product line
  - Desktop and laptop browsers as the primary interaction surface
  - Tablet-friendly responsive layout where clinically useful

## Problems to solve

1. Patient information is fragmented across scheduling, notes, paper forms, spreadsheets, and messaging tools.
2. Long treatments lose momentum because the next action is not visible.
3. Lab-dependent appointments are scheduled before work is ready.
4. Accepted treatment remains unscheduled.
5. Clinical and financial corrections are difficult to audit.
6. Persian interfaces are often translated after design and behave poorly in RTL.
7. Existing systems may be comprehensive but burden small offices with enterprise concepts.

## Product promise

The user should always be able to answer:

  - Who is the patient?
  - Why are they here today?
  - What happened clinically?
  - What treatment is planned?
  - What is the next action?
  - Is any laboratory work blocking treatment?
  - What does the patient owe?
  - Who changed a sensitive record and why?

## Product principles

### Patient context stays visible

A compact patient header remains visible throughout clinical, treatment, documents, and finance work.

### One workflow, not isolated modules

Scheduling, encounters, treatment plans, journeys, tasks, lab orders, and ledger entries link through stable identifiers and explicit domain events.

### Simple status models

Use small state machines with clear names. Detailed progress belongs in stages, timelines, and events rather than dozens of statuses.

### Draft safely, finalize deliberately

Clinical drafts may autosave. Signing is explicit. Signed content is immutable and corrected with amendments.

### Financial history is append-only

Posted charges and payments cannot be edited in place. Corrections use reversals and new postings.

### Bilingual by architecture

Persian, RTL, name scripts, Jalali/Gregorian dates, Iranian contact formats, rial/toman presentation, printed documents, and mixed-script content are designed at the domain and component level.

### Data belongs to the office

The product must support complete structured exports, documented APIs, and readable audit history.

## Success measures for the pilot

  - A receptionist can register and schedule a returning patient in less than 45 seconds under normal conditions.
  - The daily schedule opens in less than 2 seconds at the 95th percentile on the supported office network.
  - A dentist can record a common restoration finding and add it to a treatment plan in fewer than 10 intentional interactions.
  - Every active long-running journey has either a future appointment or an open next-action task.
  - No appointment linked to required lab work can be marked ready without a visible lab-readiness state.
  - Ledger day-end totals reconcile exactly with posted transactions.
  - Persian critical workflows pass the same acceptance suite.
  - Appointment, receipt, and report dates are correct in Jalali presentation while retaining canonical Gregorian/UTC values.
  - Every financial amount displays an explicit rial or toman unit and reconciles to the same canonical rial value.
