# Treatment Journeys, Follow-up, Lab Orders, and Recall

## Design objective

Provide one consistent model for long-running treatment rather than separate complicated implant, orthodontic, prosthetic, and endodontic applications.

## Treatment Journey

Required fields:

  - Patient
  - Journey type
  - Responsible dentist
  - Start date
  - Current stage
  - Next action summary
  - Next-action due date
  - Status: Planned, Active, On hold, Completed, Cancelled
  - Linked treatment-plan items, appointments, procedures, tasks, lab orders, notes, and documents

Every active journey SHOULD have either a future appointment or an open task. Exceptions require an explicit “no next action required” reason and review date.

## Journey templates

### Implant

Default stages:

1. Assessment
2. Surgery
3. Healing
4. Restoration
5. Maintenance

Optional structured placement fields include site, manufacturer/system, model, diameter, length, lot/serial number, placement date, torque, graft/membrane note, and restorative components.

### Orthodontic

Default stages:

1. Records and planning
2. Active treatment
3. Finishing
4. Retention

Progress entry fields include appliance type, arch, aligner number, aligners delivered, wire/appliance notes, cooperation, oral hygiene, progress assessment, next action, and recommended interval.

### Prosthetic/lab-dependent

Default stages:

1. Preparation
2. Impression/scan
3. Laboratory
4. Try-in
5. Delivery
6. Review

### Custom

Authorized administrators may define a small ordered stage list and task templates without creating executable custom workflow code.

## Follow-up task

Fields:

  - Patient
  - Optional journey, appointment, encounter, lab order, or recall link
  - Type
  - Assigned user or role queue
  - Due date and optional due time
  - Priority
  - Description
  - Status: Open, Done, Skipped
  - Completion note

Tasks are operational records, not project-management objects. No subtasks, dependencies graph, story points, or general Kanban builder are required.

## Follow-up Center

Views:

  - Today
  - Overdue
  - Upcoming
  - Unscheduled treatment
  - Planned appointments
  - Lab work
  - Missed/cancelled appointments
  - Active journeys without next action
  - Recall due

Rows show patient, category, stage/context, action, due date, assignee, and priority. A side panel supports completion, reassignment, patient contact logging, and appointment creation.

## Lab order

Fields:

  - Patient, dentist, laboratory
  - Journey and procedure link
  - Tooth, arch, or region
  - Work type, material, shade
  - Date prepared, sent, expected, received, ready, delivered
  - Linked delivery appointment
  - Instructions, notes, files, and communication events
  - Status: Preparing, Sent, Received, Ready, Delivered, Revision required, Cancelled

Rules:

  - A revision records reason and may create a new expected date.
  - Ready requires a recorded quality check user and time.
  - Appointment cards show readiness.
  - Lab communication may be recorded manually; direct laboratory integration is not required.

## Recall

Recall is routine repeating care and remains distinct from journey tasks. A completed recall appointment advances the next due date according to the recall definition.

## Automation rules

The system may create tasks from approved templates when a domain event occurs. Examples:

  - Implant placed → post-operative call and clinical review tasks
  - Journey enters Healing → healing assessment task
  - Lab order sent → expected-return check
  - Lab order received → quality-check task
  - Ortho visit completed → next-visit task
  - Appointment no-show → contact task

Automation MUST be visible, idempotent, auditable, and suppressible by authorized configuration.
