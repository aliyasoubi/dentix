#!/usr/bin/env bash
# Fetches the dentix-bff client secret from the running Keycloak and prints
# the line to put in .env.production.
#
# Needed because Keycloak regenerates this secret on every realm import and
# keycloak/dentix-realm.json deliberately does not contain it (a committed
# realm export must never carry a secret). Same procedure as the dev stack's
# keycloak/README.md and CI's own fetch step — this just wraps it so the
# rehearsal doesn't need a hand-assembled curl pipeline.
#
# Usage (from the repo root, after `docker compose -f docker-compose.prod.yml up -d keycloak`):
#   ./ops/local/fetch-client-secret.sh
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE not found (cp .env.production.example .env.production)" >&2
  exit 1
fi

# Read admin credentials from the env file rather than taking them as
# arguments — arguments land in shell history and process listings.
# shellcheck disable=SC1090
set -a && . "$ENV_FILE" && set +a

: "${KEYCLOAK_ADMIN:?missing in $ENV_FILE}"
: "${KEYCLOAK_ADMIN_PASSWORD:?missing in $ENV_FILE}"
CLIENT_ID="${OIDC_CLIENT_ID:-dentix-bff}"
REALM="${KEYCLOAK_REALM:-dentix}"

# Talks to Keycloak through the compose network rather than a published
# port: the production stack deliberately exposes only Caddy, and the admin
# API should not be reachable from outside the host at all (ADR-007: "Admin
# console reachable only from an allow-listed network path").
kc() {
  docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" \
    exec -T keycloak "$@"
}

TOKEN=$(kc curl -sf \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  "http://127.0.0.1:8080/realms/master/protocol/openid-connect/token" |
  sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "error: could not authenticate to Keycloak admin API" >&2
  exit 1
fi

UUID=$(kc curl -sf -H "Authorization: Bearer ${TOKEN}" \
  "http://127.0.0.1:8080/admin/realms/${REALM}/clients?clientId=${CLIENT_ID}" |
  sed -n 's/^\[{"id":"\([^"]*\)".*/\1/p')

if [ -z "$UUID" ]; then
  echo "error: client '${CLIENT_ID}' not found in realm '${REALM}'" >&2
  exit 1
fi

SECRET=$(kc curl -sf -H "Authorization: Bearer ${TOKEN}" \
  "http://127.0.0.1:8080/admin/realms/${REALM}/clients/${UUID}/client-secret" |
  sed -n 's/.*"value":"\([^"]*\)".*/\1/p')

if [ -z "$SECRET" ]; then
  echo "error: could not read client secret" >&2
  exit 1
fi

echo "OIDC_CLIENT_SECRET=${SECRET}"
