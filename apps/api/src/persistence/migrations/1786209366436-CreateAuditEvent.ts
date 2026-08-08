import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * S3 hardening (external review): identity-access's own sensitive actions
 * (login success/failure, logout, session force-revocation) now write an
 * audit trail (03-module-boundaries.md: "one use case = one transaction +
 * outbox/audit writes"; CLAUDE.md invariant 7: "All sensitive actions
 * produce audit events").
 *
 * This is the minimal slice of the target `audit_event` shape in
 * 04-architecture/04-data-model.md — that shape also has patient linkage,
 * a correlation ID, and an integrity hash, none of which identity-access
 * needs yet (no patient data exists in this release; nothing here
 * correlates across a multi-step workflow). Later modules that need the
 * fuller shape extend this table rather than each inventing their own.
 *
 * No FK on office_id/actor_user_id/entity_id: an audit row must remain
 * readable even if — hypothetically, this codebase never hard-deletes —
 * the row it references is gone, and entity_id is polymorphic across
 * entity_type so a single FK target wouldn't make sense anyway.
 */
export class CreateAuditEvent1786209366436 implements MigrationInterface {
  name = "CreateAuditEvent1786209366436";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_event" (
        "id"             uuid PRIMARY KEY,
        "office_id"      uuid,
        "actor_user_id"  uuid,
        "action"         varchar NOT NULL,
        "entity_type"    varchar NOT NULL,
        "entity_id"      uuid,
        "detail"         text,
        "occurred_at"    timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IX_audit_event_office_id" ON "audit_event" ("office_id")`);
    await queryRunner.query(`CREATE INDEX "IX_audit_event_actor_user_id" ON "audit_event" ("actor_user_id")`);
    await queryRunner.query(`CREATE INDEX "IX_audit_event_occurred_at" ON "audit_event" ("occurred_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_event"`);
  }
}
