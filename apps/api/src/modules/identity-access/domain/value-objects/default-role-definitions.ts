import { PermissionCode } from "./permission-code";

/**
 * The six fixed role codes. Exported separately from the definitions below
 * so callers that only need to *validate* a code (AddOfficeUserRequestDto's
 * @IsIn, AddOfficeUserUseCase) don't pull in the whole permission matrix,
 * and so `DefaultRoleCode` can be a real union rather than `string`.
 * Custom/editable roles are deliberately not a thing yet — the `role` table
 * allows them, nothing creates them.
 */
export const DEFAULT_ROLE_CODES = [
  "dentist",
  "dental_assistant",
  "receptionist",
  "cashier",
  "office_manager",
  "system_administrator",
] as const;

export type DefaultRoleCode = (typeof DEFAULT_ROLE_CODES)[number];

export interface DefaultRoleDefinition {
  readonly code: DefaultRoleCode;
  readonly name: string;
  readonly permissions: readonly PermissionCode[];
}

/**
 * The six default roles (01-product/04-roles-and-permissions.md) and their
 * starting grants. Pure data, no NestJS/TypeORM/vendor imports — this is
 * what makes it importable both from migration 1786742747460 (which runs
 * outside the DI container, through a raw QueryRunner) and from
 * SeedDefaultRolesUseCase (which runs inside it, through the real
 * repositories). One list, two callers, instead of the migration and the
 * use case each carrying their own copy that could quietly drift apart.
 *
 * The grants follow the permission doc's own "Default permission
 * examples" table exactly where it states one, and the separation-of-duty
 * decisions Ali made directly (refund/discount/reversal require Manager-
 * or-Admin approval, Reception posts payments). For the permission codes
 * that table doesn't mention by name, these are reasoned defaults from
 * each role's stated "Primary responsibility" — not a second approved
 * document. `role_permission` is fully office-editable data, not a schema
 * lock-in, precisely so a real office can correct any of this through
 * actual use rather than needing a migration to fix a judgment call.
 * Treat this seed as a starting point for DISC-003's eventual sign-off,
 * not the sign-off itself.
 *
 * Three defaults worth stating plainly, not left implicit in a table:
 * - System administrators do not receive patient/clinical permissions by
 *   default (rule 6), but per Ali's separation-of-duty decision they DO
 *   get ledger.refund/discount/reverse — specifically to be an eligible
 *   *approver*, not because finance is otherwise their domain.
 * - `configuration.manage` goes to both Office manager (business/finance
 *   policy — thresholds, hours) and System administrator (security/
 *   integration config) — the schema has one permission code for both
 *   concerns, not two, so both roles that legitimately need part of it
 *   get the whole thing rather than inventing a split this schema doesn't
 *   have yet.
 * - A role granted "if dentist" or "if clinician" in the permission table
 *   (e.g. Manager signing a note) is NOT baked into the Manager role's own
 *   grants here — that's a multi-role scenario (someone holds both
 *   Manager and Dentist), resolved by holding both roles, not by Manager
 *   alone carrying clinical permissions it shouldn't have by default.
 */
export const DEFAULT_ROLE_DEFINITIONS: readonly DefaultRoleDefinition[] = [
  {
    code: "dentist",
    name: "Dentist",
    permissions: [
      "patient.view",
      "patient.edit-demographics",
      "patient.export",
      "patient.view-sensitive-alerts",
      "appointment.view",
      "appointment.create",
      "appointment.reschedule",
      "appointment.cancel",
      "appointment.override-conflict",
      "schedule.manage-availability",
      "clinical.view",
      "clinical.encounter.create",
      "clinical.note.edit-draft",
      "clinical.note.sign",
      "clinical.note.amend",
      "clinical.odontogram.edit",
      "clinical.perio.edit",
      "clinical.procedure.complete",
      "treatment-plan.create",
      "treatment-plan.present",
      "treatment-plan.record-decision",
      "journey.manage",
      "follow-up.assign",
      "lab-order.manage",
      "ledger.view",
      "ledger.post-charge",
      "document.view",
      "document.upload",
      "document.view-sensitive",
      "communication.send",
      "communication.view-history",
      "report.view-clinical",
      "audit.view",
    ],
  },
  {
    code: "dental_assistant",
    name: "Dental assistant",
    permissions: [
      "patient.view",
      "patient.edit-demographics",
      "patient.view-sensitive-alerts",
      "appointment.view",
      "clinical.view",
      "clinical.note.edit-draft",
      "lab-order.manage",
      "document.view",
      "document.upload",
    ],
  },
  {
    code: "receptionist",
    name: "Receptionist",
    permissions: [
      "patient.view",
      "patient.create",
      "patient.edit-demographics",
      "appointment.view",
      "appointment.create",
      "appointment.reschedule",
      "appointment.cancel",
      "appointment.override-conflict",
      "schedule.manage-availability",
      "ledger.post-payment",
      "document.view",
      "communication.send",
      "communication.view-history",
    ],
  },
  {
    code: "cashier",
    name: "Cashier",
    permissions: [
      "patient.view",
      "appointment.view",
      "ledger.view",
      "ledger.post-payment",
      "ledger.discount",
      "ledger.refund",
      "ledger.day-end-close",
    ],
  },
  {
    code: "office_manager",
    name: "Office manager",
    permissions: [
      "patient.view",
      "patient.create",
      "patient.edit-demographics",
      "patient.merge",
      "patient.export",
      "patient.view-sensitive-alerts",
      "appointment.view",
      "appointment.create",
      "appointment.reschedule",
      "appointment.cancel",
      "appointment.override-conflict",
      "schedule.manage-availability",
      "clinical.view",
      "journey.manage",
      "follow-up.assign",
      "lab-order.manage",
      "ledger.view",
      "ledger.post-charge",
      "ledger.post-payment",
      "ledger.discount",
      "ledger.refund",
      "ledger.reverse",
      "ledger.day-end-close",
      "document.view",
      "document.upload",
      "document.view-sensitive",
      "document.delete",
      "communication.send",
      "communication.view-history",
      "report.view-clinical",
      "report.view-financial",
      "audit.view",
      "user.manage",
      "configuration.manage",
    ],
  },
  {
    code: "system_administrator",
    name: "System administrator",
    permissions: [
      // No patient/clinical permissions by default (rule 6).
      "ledger.view",
      "ledger.discount",
      "ledger.refund",
      "ledger.reverse",
      "audit.view",
      "user.manage",
      "permission.manage",
      "configuration.manage",
      "backup.manage",
    ],
  },
];
