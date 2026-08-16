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
# Works for either database the backup job produces — the application one
# and `keycloak`. A drill that only restores the application database proves
# half of recovery: it shows patient records come back while saying nothing
# about whether anyone can log in to reach them. Restore both, and for the
# Keycloak one, point an isolated Keycloak at the restored database and
# confirm a real login plus TOTP still works. A green pg_restore is not
# evidence of that.
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

# This script DROPs the target database. It used to accept any name, while a
# comment below claimed it "only ever touches TARGET_DB" — true but useless,
# because TARGET_DB could be `dentix`. Passing the live database name would
# have destroyed production data with no prompt. The guard is here rather than
# in documentation because a drill is exactly when someone types fast.
case "$TARGET_DB" in
  *[!a-zA-Z0-9_]* | "" | [!a-zA-Z_]*)
    echo "error: target database name '${TARGET_DB}' is not a plain identifier" >&2
    exit 1
    ;;
esac

for protected in "${POSTGRES_DB:-}" "${KEYCLOAK_DB:-}" postgres template0 template1; do
  if [ -n "$protected" ] && [ "$TARGET_DB" = "$protected" ]; then
    if [ "${ALLOW_DESTRUCTIVE_RESTORE:-}" = "yes-destroy-${protected}" ]; then
      echo "dentix-restore: DESTRUCTIVE restore into live database '${protected}' explicitly authorised" >&2
      break
    fi
    echo "error: '${TARGET_DB}' is a live database. Restore into an isolated name and validate there." >&2
    echo "       A real recovery that must overwrite it requires:" >&2
    echo "       ALLOW_DESTRUCTIVE_RESTORE=yes-destroy-${protected}" >&2
    exit 1
  fi
done

export PGPASSWORD="${POSTGRES_PASSWORD}"
START_EPOCH=$(date +%s)
echo "dentix-restore: starting at $(date -u +%Y-%m-%dT%H:%M:%SZ), target database '${TARGET_DB}'"

# Integrity check before trusting the file with a passphrase at all — a
# corrupted or tampered backup should fail loudly here, not partway through
# pg_restore with an ambiguous error.
if [ -f "${ENCRYPTED_PATH}.sha256" ]; then
  ( cd "$(dirname "$ENCRYPTED_PATH")" && sha256sum -c "$(basename "$ENCRYPTED_PATH").sha256" )
  echo "dentix-restore: checksum OK"
elif [ "${ALLOW_MISSING_CHECKSUM:-}" = "yes" ]; then
  echo "warning: no .sha256 alongside ${ENCRYPTED_PATH}; proceeding because ALLOW_MISSING_CHECKSUM=yes" >&2
else
  # Previously a warning that carried on regardless, which defeats the point:
  # the drill would pass on a truncated or tampered file and only fail later
  # with an ambiguous pg_restore error, or not at all.
  echo "error: no .sha256 file alongside ${ENCRYPTED_PATH} — refusing to trust it." >&2
  echo "       Copy the .sha256 with the backup, or set ALLOW_MISSING_CHECKSUM=yes to override." >&2
  exit 1
fi

# DROP/CREATE only ever touches TARGET_DB, which the guard above has already
# confirmed is not a live database. The connection itself is made to
# `postgres`, purely as the maintenance database CREATE DATABASE requires.
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";" \
  -c "CREATE DATABASE \"${TARGET_DB}\";"

# Streamed, mirroring backup-postgres.sh. This used to decrypt to a
# plaintext file next to the encrypted one and rm it in an EXIT trap, which
# left real patient data on disk for the whole duration of the restore and
# indefinitely if the process was killed. pg_restore reads a custom-format
# archive from stdin, so the cleartext only ever exists in the pipe.
# (No -j here: parallel restore needs a seekable file, and correctness on a
# recovery path is worth more than speed.)
gpg --batch --yes --passphrase-file "$BACKUP_ENCRYPTION_PASSPHRASE_FILE" \
  --decrypt "$ENCRYPTED_PATH" \
  | pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$TARGET_DB" \
      --no-owner --exit-on-error

END_EPOCH=$(date +%s)
ELAPSED=$((END_EPOCH - START_EPOCH))
echo "dentix-restore: done in ${ELAPSED}s. Database '${TARGET_DB}' is ready for validation"
echo "dentix-restore: next — validate referential integrity and representative records before any promotion (see 06-operations/02-backup-recovery.md)"
