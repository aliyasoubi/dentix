#!/usr/bin/env bash
# Takes one encrypted PostgreSQL backup, prunes old ones, and optionally
# copies it off-host. Run on a schedule by entrypoint.sh's cron job, or
# on demand: `docker compose ... exec backup /scripts/backup-postgres.sh`.
#
# 06-operations/02-backup-recovery.md's requirements, and how each is met:
#   - Encryption            -> gpg symmetric, AES256, passphrase file (never
#                              an env var — those are readable via `docker
#                              inspect`/`ps aux`; a file is not)
#   - Separate failure domain -> optional rclone copy to BACKUP_RCLONE_REMOTE
#   - Retention tiers       -> BACKUP_RETENTION_DAYS, applied identically
#                              local and remote
#   - Automated monitoring  -> non-zero exit on any failure (set -euo
#                              pipefail) plus an optional healthcheck ping
#   - Periodic integrity checks -> sha256 recorded alongside every backup;
#                              restore-postgres.sh re-verifies it before
#                              ever decrypting
set -euo pipefail

: "${POSTGRES_HOST:?}" "${POSTGRES_PORT:?}" "${POSTGRES_DB:?}" "${POSTGRES_USER:?}" "${POSTGRES_PASSWORD:?}"
: "${BACKUP_ENCRYPTION_PASSPHRASE_FILE:?set BACKUP_ENCRYPTION_PASSPHRASE_FILE to a mounted passphrase file}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BASENAME="${POSTGRES_DB}-${TIMESTAMP}"
DUMP_PATH="${BACKUP_DIR}/${BASENAME}.dump"
ENCRYPTED_PATH="${DUMP_PATH}.gpg"

export PGPASSWORD="${POSTGRES_PASSWORD}"
mkdir -p "$BACKUP_DIR"

ping_healthcheck() {
  # Dead-man's-switch pattern: many people already self-host or use the free
  # tier of a service like this; optional and skipped cleanly when unset
  # rather than treated as a hard dependency, since standing up real alerting
  # infrastructure is explicitly an R6/pre-pilot concern, not a Release 1 one.
  local suffix="${1:-}"
  if [ -n "${BACKUP_HEALTHCHECK_URL:-}" ]; then
    curl -fsS -m 10 --retry 3 "${BACKUP_HEALTHCHECK_URL}${suffix}" -o /dev/null || true
  fi
}

on_failure() {
  echo "dentix-backup: FAILED at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
  rm -f "$DUMP_PATH"
  ping_healthcheck "/fail"
}
trap on_failure ERR

echo "dentix-backup: starting for ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT}"

# Custom format (-Fc): compressed and restorable selectively/in parallel,
# unlike a plain SQL dump — matches what restore-postgres.sh expects.
pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom --file="$DUMP_PATH"

gpg --batch --yes --passphrase-file "$BACKUP_ENCRYPTION_PASSPHRASE_FILE" \
  --symmetric --cipher-algo AES256 --output "$ENCRYPTED_PATH" "$DUMP_PATH"

# The unencrypted dump contains real patient data once this runs against
# production — it must not survive on disk even momentarily longer than the
# encryption step needs.
rm -f "$DUMP_PATH"

sha256sum "$ENCRYPTED_PATH" > "${ENCRYPTED_PATH}.sha256"
SIZE=$(du -h "$ENCRYPTED_PATH" | cut -f1)
echo "dentix-backup: wrote ${ENCRYPTED_PATH} (${SIZE})"

# --- local retention ---
find "$BACKUP_DIR" -maxdepth 1 -name "${POSTGRES_DB}-*.dump.gpg*" -mtime "+${RETENTION_DAYS}" -print -delete

# --- off-host copy (second failure domain) ---
if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  rclone copy "$ENCRYPTED_PATH" "$BACKUP_RCLONE_REMOTE" --config "${RCLONE_CONFIG:-/etc/rclone/rclone.conf}"
  rclone copy "${ENCRYPTED_PATH}.sha256" "$BACKUP_RCLONE_REMOTE" --config "${RCLONE_CONFIG:-/etc/rclone/rclone.conf}"
  rclone delete "$BACKUP_RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d" --config "${RCLONE_CONFIG:-/etc/rclone/rclone.conf}"
  echo "dentix-backup: synced to ${BACKUP_RCLONE_REMOTE}"
else
  echo "dentix-backup: BACKUP_RCLONE_REMOTE not set — backup is local-only, NOT in a second failure domain yet." >&2
fi

date -u +%Y-%m-%dT%H:%M:%SZ > "${BACKUP_DIR}/.last-success"
ping_healthcheck
echo "dentix-backup: done"
