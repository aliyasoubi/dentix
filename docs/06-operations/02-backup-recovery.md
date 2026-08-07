# Backup and Recovery

**Scope note (`07-plans/00-build-sequencing.md`):** automated encrypted backups run from Release 1. The RPO 15-minute/PITR infrastructure, quarterly drills, and full disaster-recovery exercises below are the pre-pilot target, not a Release 1 requirement.

## Recovery objectives

Initial targets must be confirmed with the office. Recommended starting targets:

  - RPO: 15 minutes or better for database changes
  - RTO: 4 hours during supported recovery window

## Backup scope

  - PostgreSQL base backups and point-in-time recovery logs
  - Object storage versioning or backup
  - Application configuration excluding secrets, with secret-recovery procedure
  - Audit data
  - Generated document templates

## Backup requirements

  - Encryption
  - Separate failure domain
  - Retention tiers
  - Automated success/failure monitoring
  - Access restricted to approved operators
  - Periodic integrity checks

## Restore procedure

1. Declare incident and identify recovery point.
2. Preserve evidence and current state where relevant.
3. Restore database and object storage to isolated environment.
4. Validate referential integrity and representative patient records.
5. Validate audit continuity and ledger totals.
6. Obtain recovery approval.
7. Restore production service or perform controlled data promotion.
8. Document data loss window and actions.

## Testing

  - Automated backup verification daily
  - Sample restore monthly where practical
  - Full disaster-recovery exercise at least quarterly before mature production operation
  - Restore test before major high-risk migration
