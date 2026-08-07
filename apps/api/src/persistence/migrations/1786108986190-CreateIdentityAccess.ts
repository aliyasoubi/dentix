import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * S3 (proves ADR-007/ADR-013): the four Identity and Access tables needed
 * for OIDC BFF login and session (04-architecture/04-data-model.md).
 * Explicitly NOT created: provider_token_record — deferred per ADR-014
 * until a proven trigger (e.g. provider-initiated logout) requires it.
 *
 * created_by/updated_by/archived_by stay plain nullable uuid with no FK
 * across all four tables, same as `office` in the previous migration:
 * "who performed this administrative action" is a separate concern from
 * a table's own core relationships, and self-referential bootstrapping
 * (who "created" the very first user_account?) makes a hard FK awkward
 * here. user_id/office_id columns — the relationships that give each
 * table its actual meaning — do get real FKs, since both referenced
 * tables exist by the time any of these rows can exist.
 */
export class CreateIdentityAccess1786108986190 implements MigrationInterface {
  name = "CreateIdentityAccess1786108986190";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_account" (
        "id"               uuid PRIMARY KEY,
        "external_subject" varchar NOT NULL,
        "issuer"           varchar NOT NULL,
        "display_name"     varchar NOT NULL,
        "state"            varchar NOT NULL DEFAULT 'active',
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        "created_by"       uuid,
        "updated_at"       timestamptz NOT NULL DEFAULT now(),
        "updated_by"       uuid,
        "version"          integer NOT NULL DEFAULT 1,
        "archived_at"      timestamptz,
        "archived_by"      uuid,
        CONSTRAINT "UQ_user_account_issuer_subject" UNIQUE ("issuer", "external_subject"),
        CONSTRAINT "CK_user_account_state" CHECK ("state" IN ('active', 'disabled'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "office_user" (
        "id"                 uuid PRIMARY KEY,
        "office_id"          uuid NOT NULL REFERENCES "office" ("id"),
        "user_id"            uuid NOT NULL REFERENCES "user_account" ("id"),
        "permission_version" integer NOT NULL DEFAULT 1,
        "is_active"          boolean NOT NULL DEFAULT true,
        "created_at"         timestamptz NOT NULL DEFAULT now(),
        "created_by"         uuid,
        "updated_at"         timestamptz NOT NULL DEFAULT now(),
        "updated_by"         uuid,
        "version"            integer NOT NULL DEFAULT 1,
        "archived_at"        timestamptz,
        "archived_by"        uuid,
        CONSTRAINT "UQ_office_user_office_user" UNIQUE ("office_id", "user_id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IX_office_user_user_id" ON "office_user" ("user_id")`);

    await queryRunner.query(`
      CREATE TABLE "user_session" (
        "id"                   uuid PRIMARY KEY,
        "session_hash"         varchar NOT NULL,
        "user_id"               uuid NOT NULL REFERENCES "user_account" ("id"),
        "office_id"            uuid NOT NULL REFERENCES "office" ("id"),
        "authenticated_at"     timestamptz NOT NULL,
        "mfa_context"          varchar,
        "csrf_token_hash"      varchar NOT NULL,
        "permission_version"   integer NOT NULL,
        "created_at"           timestamptz NOT NULL DEFAULT now(),
        "last_seen_at"         timestamptz NOT NULL DEFAULT now(),
        "idle_expires_at"      timestamptz NOT NULL,
        "absolute_expires_at"  timestamptz NOT NULL,
        "revoked_at"           timestamptz,
        "revoked_reason"       varchar,
        CONSTRAINT "UQ_user_session_session_hash" UNIQUE ("session_hash")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IX_user_session_user_id" ON "user_session" ("user_id")`);

    await queryRunner.query(`
      CREATE TABLE "oidc_authorization_request" (
        "id"                       uuid PRIMARY KEY,
        "state_hash"               varchar NOT NULL,
        "nonce_encrypted"          text NOT NULL,
        "pkce_verifier_encrypted"  text NOT NULL,
        "return_path"              varchar NOT NULL,
        "created_at"               timestamptz NOT NULL DEFAULT now(),
        "expires_at"               timestamptz NOT NULL,
        "used_at"                  timestamptz,
        CONSTRAINT "UQ_oidc_authorization_request_state_hash" UNIQUE ("state_hash")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "oidc_authorization_request"`);
    await queryRunner.query(`DROP TABLE "user_session"`);
    await queryRunner.query(`DROP TABLE "office_user"`);
    await queryRunner.query(`DROP TABLE "user_account"`);
  }
}
