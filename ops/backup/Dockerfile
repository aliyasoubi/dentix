# syntax=docker/dockerfile:1
#
# ADR-010 / 06-operations/02-backup-recovery.md: "automated encrypted backups
# run from Release 1." This image takes and restores them.
#
# Built FROM the exact same postgres:18.0 tag as the database service, not a
# generic "postgres-client" image — pg_dump/pg_restore must match the server
# version they talk to, and pinning both to one tag makes that automatic
# rather than something to remember on the next Postgres upgrade.
#
# Every added package comes from Debian's own apt repos, not a fetched GitHub
# release binary: R-03 (07-plans/risks.md) is registry/network access from
# Iran being unreliable, and an apt mirror is far more likely to be reachable
# and cacheable than an arbitrary upstream release URL.
FROM postgres:18.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    gnupg \
    rclone \
    curl \
    cron \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Backup timestamps are UTC, matching the canonical UTC-instant invariant
# (CLAUDE.md) — not the office's Asia/Tehran display timezone, which is a
# presentation concern, not an operational one. Fixing it here means backup
# filenames sort correctly regardless of the host's own TZ setting.
ENV TZ=UTC

COPY backup-postgres.sh restore-postgres.sh entrypoint.sh /scripts/
RUN chmod +x /scripts/*.sh

ENTRYPOINT ["/scripts/entrypoint.sh"]
