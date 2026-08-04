# Definition of Done

A feature is Done only when:

## Product

  - Requirement and acceptance criteria are approved.

  - Scope and exclusions are respected.

  - Persian and English wording is reviewed.

  - Jalali/Gregorian behavior and rial/toman unit presentation are defined where the feature handles dates or money.

  - Role and permission behavior is defined.

## Design

  - Responsive and RTL/LTR states are designed.

  - Empty, loading, error, conflict, and permission-denied states exist.

  - Keyboard and reduced-motion behavior are specified.

## Engineering

  - Domain rules reside in the correct module.

  - Database migration is forward-safe and rollback/recovery considered.

  - API is documented in OpenAPI.

  - Audit and observability are implemented.

  - No new critical/high security findings.

## Testing

  - Unit, integration, API, component, and relevant end-to-end tests pass.

  - Persian and English critical paths pass.

  - Applicable Jalali/Gregorian equivalence and canonical rial/toman tests pass.

  - Accessibility checks pass or approved exceptions are recorded.

  - Performance impact is measured for critical screens.

## Operations

  - Configuration and secrets are documented.

  - Monitoring and alerting are updated.

  - Backup/restore effect is reviewed.

  - Release and rollback notes exist.

## Documentation

  - User-facing help or training impact is addressed.

  - Domain glossary and ADRs are updated when needed.

  - No unresolved TODO is required for safe operation.
