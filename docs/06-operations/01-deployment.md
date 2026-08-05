# Deployment Guide

## Environments

  - Local development
  - Shared development/integration
  - Staging with fictional or approved anonymized data
  - Production

Production and non-production use separate accounts, secrets, databases, object stores, and identity clients.

## Build artifacts

  - Versioned Angular static bundle
  - Versioned API container
  - Versioned worker container
  - Immutable database migration set
  - SBOM and dependency scan results

## Deployment sequence

1. Validate configuration and secrets.
2. Take or verify recent recoverable backup for risky database changes.
3. Apply backward-compatible migration.
4. Deploy API/worker.
5. Deploy web bundle.
6. Run smoke tests.
7. Monitor errors, latency, jobs, and database health.
8. Complete post-deploy verification.

## Migration policy

Use expand-and-contract migrations for changes requiring multiple deployments. Avoid destructive schema changes in the same release that removes application compatibility.

## Configuration

Configuration includes office timezone (default Asia/Tehran), canonical currency (IRR), default money display unit (RIAL or TOMAN), UI/date calendar preferences, Iranian holiday calendar source, supported locales, feature flags, reminder providers, object storage, identity provider, retention settings, and thresholds. Secrets are never stored in ordinary configuration files.

## Rollback

Application rollback must be possible when schema remains backward compatible. Irreversible data migrations require a restoration or corrective migration plan approved before deployment.
