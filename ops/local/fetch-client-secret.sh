#!/usr/bin/env bash
# Fetches the dentix-bff client secret from the running Keycloak and prints
# the line to put in .env.production.
#
# Needed because Keycloak regenerates this secret on every realm import and
# keycloak/dentix-realm.json deliberately does not contain it (a committed
# realm export must never carry a secret).
#
# Uses Keycloak's own kcadm.sh rather than curl against the admin REST API:
# the production Keycloak image ships no curl (verified — it is a UBI-micro
# base), and unlike the dev stack this compose file publishes no Keycloak
# port for the host to reach, since ADR-007 wants the admin surface off the
# network entirely. kcadm.sh runs inside the container against localhost,
# which satisfies both.
#
# Usage (from the repo root, after Keycloak reports healthy):
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

kc() {
  docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" \
    exec -T keycloak /opt/keycloak/bin/kcadm.sh "$@"
}

# kcadm stores the session in the container, so this is one login followed by
# two authenticated reads.
kc config credentials \
  --server http://127.0.0.1:8080 \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null

UUID=$(kc get clients -r "$REALM" -q "clientId=${CLIENT_ID}" --fields id --format csv --noquotes | tr -d '\r')

if [ -z "$UUID" ]; then
  echo "error: client '${CLIENT_ID}' not found in realm '${REALM}'" >&2
  exit 1
fi

SECRET=$(kc get "clients/${UUID}/client-secret" -r "$REALM" --fields value --format csv --noquotes | tr -d '\r')

if [ -z "$SECRET" ]; then
  echo "error: could not read the client secret" >&2
  exit 1
fi

echo "OIDC_CLIENT_SECRET=${SECRET}"
