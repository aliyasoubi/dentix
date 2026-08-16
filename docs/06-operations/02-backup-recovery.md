# Backup and Recovery

**Scope note (`07-plans/00-build-sequencing.md`):** automated encrypted backups run from Release 1. The RPO 15-minute/PITR infrastructure, quarterly drills, and full disaster-recovery exercises below are the pre-pilot target, not a Release 1 requirement.

## Recovery objectives

Initial targets must be confirmed with the office. Recommended starting targets:

  - RPO: 15 minutes or better for database changes
  - RTO: 4 hours during supported recovery window

## Backup scope

  - **Both PostgreSQL databases: the application database AND `keycloak`.** They share one
    Postgres instance but `pg_dump` takes one database per invocation, so this has to be
    explicit. Backing up only the application database yields a recovery in which every patient
    record returns and nobody can log in — users, credentials and TOTP enrolments all live in
    the `keycloak` database. A backup run is only a success once both encrypted files and both
    checksums exist.
  - PostgreSQL base backups and point-in-time recovery logs
  - Object storage versioning or backup
  - Application configuration excluding secrets, with secret-recovery procedure
  - Audit data
  - Generated document templates

## Backup requirements

  - Encryption. `pg_dump` is piped directly into `gpg`, and `gpg --decrypt` directly into
    `pg_restore`, so an unencrypted dump never exists on disk at any point — not even briefly.
    Writing plaintext and deleting it afterwards is not sufficient: an abrupt termination in
    that window leaves patient data in the clear on the backup volume.
  - Separate failure domain
  - Retention tiers
  - Automated success/failure monitoring
  - Access restricted to approved operators
  - Periodic integrity checks

## Restore procedure

1. Declare incident and identify recovery point.
2. Preserve evidence and current state where relevant.
3. Restore **both** databases and object storage to an isolated environment.
4. Validate referential integrity and representative patient records.
5. Validate audit continuity and ledger totals.
6. Boot an isolated Keycloak against the restored `keycloak` database and complete a real login
   including TOTP. A successful `pg_restore` proves the rows came back, not that anyone can
   authenticate — treat the drill as failed until a login actually succeeds.
7. Obtain recovery approval.
8. Restore production service or perform controlled data promotion.
9. Document data loss window and actions.

## Testing

  - Automated backup verification daily
  - Sample restore monthly where practical
  - Full disaster-recovery exercise at least quarterly before mature production operation
  - Restore test before major high-risk migration
