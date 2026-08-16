#!/usr/bin/env bash
# Dev-only: prints both confidential client secrets as .env lines.
#
# Keycloak regenerates these on every realm import and dentix-realm.json
# deliberately carries neither (a committed realm export must never hold a
# secret), so they have to be fetched after the container starts.
#
# Two clients, not one — missing the second is why "add office user" fails
# locally with a confusing 500:
#   dentix-bff           -> OIDC_CLIENT_SECRET           (browser login)
#   dentix-admin-lookup  -> KEYCLOAK_ADMIN_CLIENT_SECRET (API's user lookup)
#
# The production equivalent is ops/local/fetch-client-secret.sh, which goes
# through kcadm.sh inside the container because that stack publishes no
# Keycloak port. This one talks to the dev port directly.
#
# Usage (from the repo root, after `docker compose up -d keycloak`):
#   ./keycloak/fetch-dev-secrets.sh
#   ./keycloak/fetch-dev-secrets.sh >> .env     # append straight to .env
set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin_dev_only}"
REALM="${KEYCLOAK_REALM:-dentix}"

TOKEN=$(curl -sf -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${KEYCLOAK_ADMIN}&password=${KEYCLOAK_ADMIN_PASSWORD}&grant_type=password&client_id=admin-cli" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

secret_for() {
  local client="$1" uuid
  uuid=$(curl -sf "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=${client}" \
    -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")
  if [ -z "$uuid" ]; then
    echo "error: client '${client}' not found in realm '${REALM}'." >&2
    echo "       Re-import the realm — dentix-realm.json defines both clients." >&2
    exit 1
  fi
  curl -sf "$KEYCLOAK_URL/admin/realms/$REALM/clients/${uuid}/client-secret" \
    -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['value'])"
}

echo "OIDC_CLIENT_SECRET=$(secret_for dentix-bff)"
echo "KEYCLOAK_ADMIN_CLIENT_ID=dentix-admin-lookup"
echo "KEYCLOAK_ADMIN_CLIENT_SECRET=$(secret_for dentix-admin-lookup)"
