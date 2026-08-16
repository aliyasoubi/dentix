#!/bin/sh
# Keycloak in production mode needs its own persistent database (see
# docker-compose.prod.yml — `start-dev`'s embedded H2 store is not
# production-safe and loses every user's TOTP enrolment when the container
# is replaced). It lives on the same Postgres instance as the application
# database rather than a second server: one office, one host.
#
# Sharing an instance does NOT mean sharing a backup. This comment used to
# claim the backup pipeline "covers both by construction" — it does not, and
# did not: pg_dump takes one database per invocation, so the job dumped only
# the application database and silently excluded every user, credential and
# TOTP enrolment stored here. backup-postgres.sh now dumps this database
# explicitly (KEYCLOAK_DB, defaulting to `keycloak`); if it is ever renamed
# or moved, that script has to be updated with it.
#
# Runs only on first initialisation of an empty data directory, which is
# exactly the right trigger — this is provisioning, not a migration.
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE keycloak;
EOSQL

echo "created 'keycloak' database for the identity provider"
