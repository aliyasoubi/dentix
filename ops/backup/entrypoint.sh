#!/usr/bin/env bash
# Container entrypoint: wires up cron (a real scheduler, not a hand-rolled
# sleep loop — this runs for the life of the host, so DST/clock-jump/restart
# edge cases that cron already solved are worth not re-solving) and then
# blocks in the foreground as PID 1.
#
# The one real gotcha with Docker+cron: cron jobs do NOT inherit the
# container's environment (POSTGRES_PASSWORD, the encryption passphrase
# location, etc.) — cron starts each job with a near-empty environment of its
# own. Captured once here, at container start, into a file the cron job
# explicitly sources.
set -euo pipefail

# KEYCLOAK_DB is in this list deliberately: backup-postgres.sh dumps that
# database too, and if the var didn't propagate here a deployment that
# overrode it would still work when run by hand and silently fall back to the
# default on every scheduled run — the worst kind of backup bug, because it
# only shows up during a restore.
env | grep -E '^(POSTGRES_|BACKUP_|KEYCLOAK_DB=)' > /etc/backup-env
chmod 600 /etc/backup-env

SCHEDULE="${BACKUP_CRON_SCHEDULE:-0 3 * * *}"
echo "${SCHEDULE} root . /etc/backup-env && /scripts/backup-postgres.sh >> /var/log/backup.log 2>&1" > /etc/cron.d/dentix-backup
chmod 0644 /etc/cron.d/dentix-backup
touch /var/log/backup.log

echo "dentix-backup: scheduled '${SCHEDULE}' (UTC). Waiting."
# -f: foreground, so this process (PID 1) is what docker stop actually signals,
# and container logs show cron's own activity instead of going dark.
exec cron -f
