# Reference-Product Feature Traceability

## Purpose

This matrix ensures the design captures useful principles from CareStack, Curve Dental, and Open Dental without copying proprietary source code, screens, artwork, or terminology.

| **User need**                    | **Reference observation**                                                                                 | **Our simplified implementation**                                                      | **Release** | **Acceptance signal**                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| Fast daily operation             | Curve emphasizes intuitive charting, scheduling, and treatment workflow                                   | Persistent patient context, quick actions, keyboard support, minimal modal use         | R2-R4       | Common workflows meet interaction budgets                   |
| Treatment-to-schedule continuity | Curve describes procedures flowing from treatment planning into scheduling                                | Treatment-plan item can create a planned or booked appointment without re-entry        | R4          | Tooth, procedure, provider, and duration transfer correctly |
| Connected clinical operations    | CareStack presents charting, treatment planning, lab, and implant tracking in one PMS                     | Linked encounter, plan, journey, task, lab order, and ledger domains                   | R3-R5       | Patient timeline displays all linked events                 |
| Implant activity tracking        | CareStack provides implant activity timeline and identification tracking                                  | Implant journey template with placement data, stages, tasks, and maintenance recall    | R4          | Every active implant case has visible stage and next action |
| Ortho progress                   | CareStack uses case status, objectives, visit notes, aligner milestones; Open Dental has ortho case/chart | Ortho journey template plus structured progress entries                                | R4          | Visit progress and next interval retained chronologically   |
| Lab readiness                    | CareStack and Open Dental track lab cases; Open Dental links cases to appointments                        | Lightweight Lab Order with expected date, readiness status, and appointment dependency | R4          | Schedule warns when dependent lab order is not ready        |
| Planned future care              | Open Dental uses planned appointments and tracker                                                         | Planned Appointment and Follow-up Center                                               | R2/R4       | Planned-but-unscheduled visits appear in one queue          |
| Broken or unscheduled follow-up  | Open Dental uses unscheduled lists; Curve reports unscheduled treatment                                   | Unified Follow-up Center with source category and due date                             | R4          | Overdue and unscheduled items are actionable from one page  |
| Flexible operational data        | Open Dental exposes explicit states and supports data access/customization                                | Stable internal codes, documented REST API, exports, configurable catalogs/templates   | R1-R6       | Office can export complete structured patient record        |
| Modern bilingual UX              | Not a primary differentiator of the three references                                                      | Native Persian/English runtime design, RTL/LTR, bilingual documents                    | R1 onward   | Same critical workflows pass in both languages              |

## Design conclusion

The PMS must not create a separate complex module for every specialty. Implant, orthodontic, prosthetic, and custom long-running care are Treatment Journey templates sharing the same task, timeline, appointment, document, and lab infrastructure.
