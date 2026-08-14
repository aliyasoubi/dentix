import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The real target authorization model (04-architecture/04-data-model.md,
 * "Identity and Access"), replacing the `office_user.is_office_admin`
 * stopgap that migration 1786621942309 added specifically to be replaced —
 * see that column's own domain-entity comment. DISC-003 (01-product/
 * 04-roles-and-permissions.md) now has its content fully decided; this is
 * the schema that content maps onto.
 *
 * `role` is office-owned (unique per office_id+code) because the target
 * design lets an office define its own roles, not just the six defaults —
 * this migration only creates the table, seeding the six defaults for the
 * existing office is a separate migration (S1 slice 3) so schema and data
 * changes stay independently revertable.
 *
 * `permission` is application-owned and globally unique — codes are fixed
 * by the application, never created by an office — so its seed data (the
 * permission vocabulary itself) belongs in *this* migration, not a later
 * one: a role_permission grant can't reference a permission code that
 * doesn't exist yet, and there is no version of this schema that is
 * meaningfully "created but not yet knowing its own vocabulary."
 *
 * `user_role` and `role_permission` are plain link tables: created_at only,
 * no soft-delete. Revoking a role or editing a role's grants is a real
 * delete, same as `office_user.is_active` toggling rather than the row
 * itself being append-only — the historical fact belongs to `audit_event`
 * (rule 8: "permission changes take effect promptly and create audit
 * events"), not to the link row surviving in a deleted state.
 *
 * `user_permission_exception` gets `revoked_at`/`revoked_by` in addition to
 * `expires_at`: those answer different questions. `expires_at` is a planned
 * time-bound set at grant time; `revoked_at` is someone ending it early.
 * Collapsing them into one column would lose which one happened. Same
 * pattern as `user_session.revoked_at` and `office.archived_at` elsewhere
 * in this schema — state that needs a lasting trace gets a nullable
 * "ended" column, not a hard delete.
 */
export class CreateRolePermissions1786735766477 implements MigrationInterface {
  name = "CreateRolePermissions1786735766477";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "role" (
        "id"         uuid PRIMARY KEY,
        "office_id"  uuid NOT NULL REFERENCES "office" ("id"),
        "code"       varchar NOT NULL,
        "name"       varchar NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "created_by" uuid,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "updated_by" uuid,
        "version"    integer NOT NULL DEFAULT 1,
        "archived_at" timestamptz,
        "archived_by" uuid,
        CONSTRAINT "UQ_role_office_code" UNIQUE ("office_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "permission" (
        "id"   uuid PRIMARY KEY,
        "code" varchar NOT NULL,
        CONSTRAINT "UQ_permission_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_role" (
        "id"             uuid PRIMARY KEY,
        "office_user_id" uuid NOT NULL REFERENCES "office_user" ("id"),
        "role_id"        uuid NOT NULL REFERENCES "role" ("id"),
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "created_by"     uuid,
        CONSTRAINT "UQ_user_role_office_user_role" UNIQUE ("office_user_id", "role_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IX_user_role_office_user_id" ON "user_role" ("office_user_id")`);

    await queryRunner.query(`
      CREATE TABLE "role_permission" (
        "id"            uuid PRIMARY KEY,
        "role_id"       uuid NOT NULL REFERENCES "role" ("id"),
        "permission_id" uuid NOT NULL REFERENCES "permission" ("id"),
        "created_at"    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_role_permission_role_permission" UNIQUE ("role_id", "permission_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IX_role_permission_role_id" ON "role_permission" ("role_id")`);

    await queryRunner.query(`
      CREATE TABLE "user_permission_exception" (
        "id"             uuid PRIMARY KEY,
        "office_user_id" uuid NOT NULL REFERENCES "office_user" ("id"),
        "permission_id"  uuid NOT NULL REFERENCES "permission" ("id"),
        "effect"         varchar NOT NULL,
        "reason"         text NOT NULL,
        "effective_at"   timestamptz NOT NULL DEFAULT now(),
        "expires_at"     timestamptz,
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "created_by"     uuid,
        "revoked_at"     timestamptz,
        "revoked_by"     uuid,
        CONSTRAINT "CK_user_permission_exception_effect" CHECK ("effect" IN ('grant', 'deny'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IX_user_permission_exception_office_user_id" ON "user_permission_exception" ("office_user_id")`,
    );

    // The permission vocabulary itself — 01-product/04-roles-and-
    // permissions.md's seven families, verbatim. Adding a family later is
    // a migration (application-owned per the table's own definition, not
    // office-editable); this list is the reason that ownership rule exists.
    const permissionCodes = [
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
    ];
    const values = permissionCodes.map((code) => `(gen_random_uuid(), '${code}')`).join(",\n        ");
    await queryRunner.query(`INSERT INTO "permission" ("id", "code") VALUES\n        ${values}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_permission_exception"`);
    await queryRunner.query(`DROP TABLE "role_permission"`);
    await queryRunner.query(`DROP TABLE "user_role"`);
    await queryRunner.query(`DROP TABLE "permission"`);
    await queryRunner.query(`DROP TABLE "role"`);
  }
}
