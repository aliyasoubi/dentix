#!/usr/bin/env bash
# Dev-only: creates one test user in the dentix realm for local login testing.
# Not part of the realm export (ADR-007 excludes secrets/users from it) --
# users aren't configuration, they're data, and this one is throwaway.
# Safe to re-run: skips creation if the user already exists.
set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin_dev_only}"
DEV_USERNAME="${DEV_USERNAME:-dr.dev}"
DEV_PASSWORD="${DEV_PASSWORD:-DevPassword123!}"

TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$KEYCLOAK_ADMIN&password=$KEYCLOAK_ADMIN_PASSWORD&grant_type=password&client_id=admin-cli" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

EXISTING=$(curl -s "$KEYCLOAK_URL/admin/realms/dentix/users?username=$DEV_USERNAME&exact=true" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")

if [ -n "$EXISTING" ]; then
  echo "User '$DEV_USERNAME' already exists (id: $EXISTING) -- skipping."
  echo "$EXISTING"
  exit 0
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/dentix/users" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$DEV_USERNAME\",
    \"email\": \"$DEV_USERNAME@dentix.local\",
    \"emailVerified\": true,
    \"enabled\": true,
    \"firstName\": \"Dev\",
    \"lastName\": \"Dentist\",
    \"requiredActions\": [\"CONFIGURE_TOTP\"],
    \"credentials\": [{\"type\": \"password\", \"value\": \"$DEV_PASSWORD\", \"temporary\": false}]
  }")
STATUS=$(echo "$RESPONSE" | tail -1)

if [ "$STATUS" != "201" ]; then
  echo "Failed to create user (HTTP $STATUS): $(echo "$RESPONSE" | head -1)" >&2
  exit 1
fi

USER_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/dentix/users?username=$DEV_USERNAME&exact=true" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['id'])")

echo "Created '$DEV_USERNAME' (id: $USER_ID). Password: $DEV_PASSWORD" >&2
echo "First login will require TOTP enrollment (scan the QR code with any authenticator app)." >&2
echo "$USER_ID"
