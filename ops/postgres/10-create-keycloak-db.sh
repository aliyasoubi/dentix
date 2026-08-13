#!/bin/sh
# Keycloak in production mode needs its own persistent database (see
# docker-compose.prod.yml — `start-dev`'s embedded H2 store is not
# production-safe and loses every user's TOTP enrolment when the container
# is replaced). It lives on the same Postgres instance as the application
# database rather than a second server: one office, one host, and the
# backup pipeline then covers both by construction.
#
# Runs only on first initialisation of an empty data directory, which is
# exactly the right trigger — this is provisioning, not a migration.
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE keycloak;
EOSQL

echo "created 'keycloak' database for the identity provider"
