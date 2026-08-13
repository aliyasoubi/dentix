#!/usr/bin/env bash
# Restores one encrypted backup into an ISOLATED database — never the live
# one. 06-operations/02-backup-recovery.md's restore procedure step 3:
# "Restore database and object storage to isolated environment", validated
# there before ever being promoted to production.
#
# Usage (from inside the backup container, or anywhere with network access to
# Postgres and the same passphrase file):
#   ./restore-postgres.sh <path-to-backup.dump.gpg> [target-db-name]
#
# Prints wall-clock timing at the end — this is the script the RTO drill
# actually runs, so the number it prints is the number that goes in the log.
set -euo pipefail

: "${POSTGRES_HOST:?}" "${POSTGRES_PORT:?}" "${POSTGRES_USER:?}" "${POSTGRES_PASSWORD:?}"
: "${BACKUP_ENCRYPTION_PASSPHRASE_FILE:?}"

ENCRYPTED_PATH="${1:?Usage: restore-postgres.sh <path-to-backup.dump.gpg> [target-db-name]}"
TARGET_DB="${2:-restore_verify}"

if [ ! -f "$ENCRYPTED_PATH" ]; then
  echo "error: ${ENCRYPTED_PATH} not found. Fetch it from BACKUP_RCLONE_REMOTE first if restoring from the off-host copy." >&2
  exit 1
fi

export PGPASSWORD="${POSTGRES_PASSWORD}"
START_EPOCH=$(date +%s)
echo "dentix-restore: starting at $(date -u +%Y-%m-%dT%H:%M:%SZ), target database '${TARGET_DB}'"

# Integrity check before trusting the file with a passphrase at all — a
# corrupted or tampered backup should fail loudly here, not partway through
# pg_restore with an ambiguous error.
if [ -f "${ENCRYPTED_PATH}.sha256" ]; then
  ( cd "$(dirname "$ENCRYPTED_PATH")" && sha256sum -c "$(basename "$ENCRYPTED_PATH").sha256" )
  echo "dentix-restore: checksum OK"
else
  echo "warning: no .sha256 file found alongside ${ENCRYPTED_PATH} — skipping integrity check" >&2
fi

DECRYPTED_PATH="${ENCRYPTED_PATH%.gpg}"
cleanup() { rm -f "$DECRYPTED_PATH"; }
trap cleanup EXIT

gpg --batch --yes --passphrase-file "$BACKUP_ENCRYPTION_PASSPHRASE_FILE" \
  --decrypt --output "$DECRYPTED_PATH" "$ENCRYPTED_PATH"

# Isolated on purpose: DROP/CREATE only ever touches TARGET_DB, never the
# database this script was pointed at connecting to (`postgres`, used purely
# as the maintenance connection CREATE DATABASE requires).
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";" \
  -c "CREATE DATABASE \"${TARGET_DB}\";"

pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$TARGET_DB" \
  --no-owner --exit-on-error "$DECRYPTED_PATH"

END_EPOCH=$(date +%s)
ELAPSED=$((END_EPOCH - START_EPOCH))
echo "dentix-restore: done in ${ELAPSED}s. Database '${TARGET_DB}' is ready for validation"
echo "dentix-restore: next — validate referential integrity and representative records before any promotion (see 06-operations/02-backup-recovery.md)"
