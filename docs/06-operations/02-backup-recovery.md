# Backup and Recovery

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

89. Declare incident and identify recovery point.

90. Preserve evidence and current state where relevant.

91. Restore database and object storage to isolated environment.

92. Validate referential integrity and representative patient records.

93. Validate audit continuity and ledger totals.

94. Obtain recovery approval.

95. Restore production service or perform controlled data promotion.

96. Document data loss window and actions.

## Testing

  - Automated backup verification daily

  - Sample restore monthly where practical

  - Full disaster-recovery exercise at least quarterly before mature production operation

  - Restore test before major high-risk migration
