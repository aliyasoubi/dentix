#!/usr/bin/env bash
# Dev/CI-only: creates one throwaway user with a known, reproducible TOTP
# secret so an automated script (not a human with a QR code) can complete a
# real password+MFA login end to end. Not part of the realm export (ADR-007
# excludes secrets/users from it) — users aren't configuration, they're
# data, and this one is disposable.
#
# The TOTP secret below is imported via the admin API's credential-import
# path, which treats secretData.value as raw bytes (NOT base32) — verified
# empirically against this Keycloak version. Any script computing codes for
# this user must HMAC the literal UTF-8 bytes of CI_LIVE_TEST_TOTP_SECRET,
# not a base32-decoded form of it.
#
# Safe to re-run: skips creation if the user already exists.
set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin_dev_only}"
CI_LIVE_TEST_USERNAME="${CI_LIVE_TEST_USERNAME:-ci-live-test}"
CI_LIVE_TEST_PASSWORD="${CI_LIVE_TEST_PASSWORD:-CiTestPassword123!}"
CI_LIVE_TEST_TOTP_SECRET="${CI_LIVE_TEST_TOTP_SECRET:-rawsecretvalue123}"

TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$KEYCLOAK_ADMIN&password=$KEYCLOAK_ADMIN_PASSWORD&grant_type=password&client_id=admin-cli" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

EXISTING=$(curl -s "$KEYCLOAK_URL/admin/realms/dentix/users?username=$CI_LIVE_TEST_USERNAME&exact=true" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")

if [ -n "$EXISTING" ]; then
  echo "User '$CI_LIVE_TEST_USERNAME' already exists (id: $EXISTING) -- skipping."
  echo "$EXISTING"
  exit 0
fi

# credentialData/secretData shapes match what Keycloak's own OTP credential
# provider expects on import (subType totp, default digits/period/algorithm).
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/dentix/users" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$CI_LIVE_TEST_USERNAME\",
    \"email\": \"$CI_LIVE_TEST_USERNAME@dentix.local\",
    \"emailVerified\": true,
    \"enabled\": true,
    \"firstName\": \"CI\",
    \"lastName\": \"LiveTest\",
    \"requiredActions\": [],
    \"credentials\": [
      {\"type\": \"password\", \"value\": \"$CI_LIVE_TEST_PASSWORD\", \"temporary\": false},
      {
        \"type\": \"otp\",
        \"credentialData\": \"{\\\"subType\\\":\\\"totp\\\",\\\"digits\\\":6,\\\"period\\\":30,\\\"algorithm\\\":\\\"HmacSHA1\\\"}\",
        \"secretData\": \"{\\\"value\\\":\\\"$CI_LIVE_TEST_TOTP_SECRET\\\"}\"
      }
    ]
  }")
STATUS=$(echo "$RESPONSE" | tail -1)

if [ "$STATUS" != "201" ]; then
  echo "Failed to create user (HTTP $STATUS): $(echo "$RESPONSE" | head -1)" >&2
  exit 1
fi

USER_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/dentix/users?username=$CI_LIVE_TEST_USERNAME&exact=true" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['id'])")

# The create endpoint above silently ignores a client-supplied empty
# requiredActions and force-applies the realm's default required actions
# (CONFIGURE_TOTP) anyway — verified empirically, not documented behavior.
# Only a follow-up PUT actually clears it, even though the credential
# we just imported already satisfies TOTP enrollment.
curl -s -o /dev/null -w "" -X PUT "$KEYCLOAK_URL/admin/realms/dentix/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"requiredActions": []}'

echo "Created '$CI_LIVE_TEST_USERNAME' (id: $USER_ID) with password + a known TOTP secret." >&2
echo "$USER_ID"
