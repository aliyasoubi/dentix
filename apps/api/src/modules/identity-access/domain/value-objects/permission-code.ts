/**
 * The permission vocabulary, mirroring the `permission` table's seed data
 * in migration 1786735766477-CreateRolePermissions exactly —
 * 01-product/04-roles-and-permissions.md's seven families verbatim. Kept
 * as a TypeScript union (not just `string`) so `RequirePermission("...")`
 * call sites get a compile-time typo check instead of a runtime 403
 * nobody notices until someone hits the guarded route.
 *
 * The migration is the seed of record; this list is a manually-maintained
 * mirror of it, not generated from it — migrations are SQL and importing
 * TypeScript into one adds startup-order complexity for no real gain here.
 * `identity-access.int-spec.ts` asserts this list matches what the
 * migration actually inserted, so drift between the two fails a real test
 * rather than surviving as a silent gap.
 */
export const PERMISSION_CODES = [
  // Patient
  "patient.view",
  "patient.create",
  "patient.edit-demographics",
  "patient.merge",
  "patient.export",
  "patient.view-sensitive-alerts",
  // Scheduling
  "appointment.view",
  "appointment.create",
  "appointment.reschedule",
  "appointment.cancel",
  "appointment.override-conflict",
  "schedule.manage-availability",
  // Clinical
  "clinical.view",
  "clinical.encounter.create",
  "clinical.note.edit-draft",
  "clinical.note.sign",
  "clinical.note.amend",
  "clinical.odontogram.edit",
  "clinical.perio.edit",
  "clinical.procedure.complete",
  // Treatment
  "treatment-plan.create",
  "treatment-plan.present",
  "treatment-plan.record-decision",
  "journey.manage",
  "follow-up.assign",
  "lab-order.manage",
  // Finance
  "ledger.view",
  "ledger.post-charge",
  "ledger.post-payment",
  "ledger.discount",
  "ledger.refund",
  "ledger.reverse",
  "ledger.day-end-close",
  // Documents and communications
  "document.view",
  "document.upload",
  "document.view-sensitive",
  "document.delete",
  "communication.send",
  "communication.view-history",
  // Administration
  "report.view-clinical",
  "report.view-financial",
  "audit.view",
  "user.manage",
  "permission.manage",
  "configuration.manage",
  "backup.manage",
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];
