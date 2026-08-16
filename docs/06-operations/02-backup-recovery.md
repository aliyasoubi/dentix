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

### Running the drill

The drill has to end in a **successful login**, not a successful `pg_restore`. The shape that
was verified (2026-08-16, against fictional data):

1. Take a backup with `backup-postgres.sh` — it produces one encrypted file plus checksum per
   database.
2. Restore each with `restore-postgres.sh <file.gpg> <isolated-target-db>`.
3. **Stop the source Keycloak and drop its database.** Without this the next step can silently
   pass by talking to the original, which is the easiest way to fake a green drill.
4. Start a Keycloak against the restored database with **no `--import-realm`**: the realm must
   come from the backup. If it appears, realm configuration survived.
5. Authenticate a user that has TOTP enrolled. Check all four outcomes, not just the last:
   wrong password rejected, correct password with no OTP rejected, correct password with a
   wrong OTP rejected, correct password with a correct OTP **accepted**.

Two traps worth knowing before running it, both hit during the verified drill:

  - The realm is brute-force protected. Running the three negative cases first locks the account
    and makes the positive case fail with `invalid_user_credentials`, which looks exactly like a
    failed restore. Run the positive case first, or clear the lockout via
    `attack-detection/brute-force/users/{id}` between cases.
  - A restored user with an incomplete profile (no first/last name) or a pending required action
    fails with `Account is not fully set up` rather than a credential error. That is a profile
    problem, not a backup problem.
