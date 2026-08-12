import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * ADR-006 acceptance item 3 / 00-build-sequencing.md ("Keep the outbox
 * schema now, but do not build a generic event-consumption platform
 * before actual consumers exist. The schema is cheap; the platform around
 * it is not."). Full envelope per 08-transaction-event-semantics.md and
 * 04-data-model.md's `outbox_event` row — no consumer exists yet, so
 * nothing writes here in production code today; this migration and the
 * repository's `claimBatch` prove the `FOR UPDATE SKIP LOCKED` claim
 * semantics the ADR requires, not a full publish pipeline.
 */
export class CreateOutboxEvent1786479238032 implements MigrationInterface {
  name = "CreateOutboxEvent1786479238032";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "outbox_event" (
        "id"                 uuid PRIMARY KEY,
        "event_type"         varchar NOT NULL,
        "event_version"      integer NOT NULL,
        "occurred_at"        timestamptz NOT NULL,
        "office_id"          uuid NOT NULL,
        "aggregate_type"     varchar NOT NULL,
        "aggregate_id"       uuid NOT NULL,
        "aggregate_version"  integer NOT NULL,
        "actor_id"           uuid,
        "correlation_id"     uuid NOT NULL,
        "causation_id"       uuid,
        "payload"            jsonb NOT NULL,
        "created_at"         timestamptz NOT NULL DEFAULT now(),
        "available_at"       timestamptz NOT NULL DEFAULT now(),
        "published_at"       timestamptz,
        "attempts"           integer NOT NULL DEFAULT 0,
        "last_error"         text
      )
    `);
    await queryRunner.query(`CREATE INDEX "IX_outbox_event_office_id" ON "outbox_event" ("office_id")`);
    // 04-data-model.md index baseline: "Outbox unpublished rows by
    // available time" — partial index, since claiming only ever scans
    // unpublished rows and a full index would carry every published row
    // forever for no query this table serves.
    await queryRunner.query(
      `CREATE INDEX "IX_outbox_event_unpublished_available_at" ON "outbox_event" ("available_at") WHERE "published_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "outbox_event"`);
  }
}
