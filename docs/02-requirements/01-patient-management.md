# Patient Management Requirements

## Patient identity

The system MUST assign an immutable internal patient identifier and a human-readable office patient number. Names MUST support native script, Latin script, preferred display name, and previous names without automatic transliteration.

### Required fields

  - Status: active, inactive, deceased, duplicate candidate, archived
  - Native full name
  - At least one contact method unless explicitly unavailable
  - Preferred communication language: stored per ADR-012's hedge for a future locale; v1 has no functional effect since all documents/communications are Persian-only
  - Date of birth where known
  - Sex or clinical sex field according to local office policy
  - Created by and created at

### Optional fields

  - Latin full name
  - Photograph
  - Address
  - Email
  - Occupation
  - Referral source
  - Emergency contact
  - Iranian national code or other local identification number, only when legally and operationally justified

## Iranian contact and address rules

  - Mobile numbers MUST accept common forms such as 09xxxxxxxxx, +989xxxxxxxxx, and 00989xxxxxxxxx, retain the original entered value for display/audit, and store a canonical normalized value for search and duplicate detection.
  - Persian and Latin digits MUST be accepted in telephone and identification inputs.
  - National code is optional. When enabled by office policy, formatting and checksum validation SHOULD be available, but a missing national code MUST NOT block patient registration.
  - Address fields SHOULD support province, city, district/locality, street/address lines, postal code, and free-form delivery notes while remaining usable for foreign or nonstandard addresses.
  - Persian list sorting SHOULD use locale-aware collation; the application MUST provide deterministic fallback sorting for mixed Persian/Latin names.

## Search

Search MUST accept Persian and Latin digits, normalize Arabic/Persian variants of Yeh and Kaf, ignore optional diacritics, and support partial matching for names and phone numbers. Search results MUST show enough context to avoid opening the wrong patient but must not expose unnecessary sensitive data.

## Duplicate prevention

On create and import, the system SHOULD score potential duplicates using normalized name, phone, birth date, email, and local identifier. It MUST never merge automatically.

A merge operation MUST:

1. Require explicit source and destination selection.
2. Display conflicts for demographic fields.
3. Move related appointments, encounters, plans, journeys, tasks, documents, and ledger records transactionally.
4. Retain the source patient as a merged alias.
5. Create a detailed audit event.

## Relationships

Supported relationship types include parent, child, spouse, guardian, responsible person, and emergency contact. Relationship and financial responsibility are separate fields.

## Alerts

Alerts include category, severity, message, start date, optional expiry, visibility scope, author, and acknowledgment events. Critical medical alerts remain visible in the patient header and appointment check-in.

## Patient header

The persistent patient header MUST display:

  - Name and patient number
  - Age or date of birth
  - Photograph when available
  - Preferred language
  - Critical alerts and allergies
  - Today’s appointment state
  - Active treatment-journey indicator
  - Current balance, subject to permission

## Acceptance examples

  - Searching the same Iranian mobile in 09..., +98..., or Persian-digit form returns the same intended patient where appropriate.
  - A receptionist cannot see a clinical note merely because they can edit demographics.
  - A merged patient remains discoverable through the old patient number and redirects to the canonical record.
