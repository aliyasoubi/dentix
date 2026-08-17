# Release 1 — Patient Book (active release contract)

**This is the only document that authorizes implementation right now.** Everything else in
`docs/` — the architecture set, the data model, later release plans — describes the long-term
target. See CLAUDE.md, "What authorizes implementation".

## Office outcome

Replace the office's patient spreadsheet, patient list, or paper index with a secure electronic
patient registry.

## The standalone test

> If Dentix development stopped permanently after this release, could the office deploy and use
> it as its patient directory?

If the answer is no, the release is not finished. Scheduling, treatment and billing must not be
required for this to be useful — and this release must not leave fundamentals for Release 2 to
repair.

## Completeness rule

A patient field is not done until it can be **entered, validated, stored, displayed, edited,
authorized and tested**. Do not add a new field unless the same release delivers all seven.

Two existing fields currently fail this rule and are the first work in the release:

- **National code / passport number** — entered, validated (checksum for a national code, format
  check for a passport), stored. Still cannot be viewed, edited, or searched by its own value —
  no patient detail page exists yet.
- **Address** — entered, stored. Cannot be viewed or edited.

## Included

- Quick patient registration (exists)
- International patients: a `nationality` field (iranian/foreign) switches the identifier field
  between an Iranian national code (checksum-validated) and a passport number (format-validated) —
  added 2026-08-17 at the product owner's direction (exists)
- Patient search by Persian name, mobile, or exact patient number (exists) — national-code/passport
  search does not exist yet
- Debounced, cancellation-safe search — a rapid typist no longer fires a request per keystroke,
  and a slow response for an old query can no longer overwrite results for a newer one (exists)
- **Patient detail page** (does not exist — the central gap)
- **Edit demographics** (does not exist)
- View and edit address, identifier (national code/passport), contacts (does not exist)
- Mobile, national-code, and passport-number validation (exists)
- Duplicate warning on create (does not exist)
- Birth date, sex (exist)
- Important medical alerts (does not exist)
- Audit trail for important changes (exists for create; not for edit)
- **Role management** — grant *and change* a user's role, and see who holds what. Only granting
  at onboarding exists; a wrong role currently needs SQL to fix, which fails the standalone test.
- Essential patient export (does not exist)
- Tested backup and restore (done in the Foundation Recovery Sprint)
- Complete Farsi RTL workflow throughout

## Explicitly excluded

Scheduling · treatment charting · patient finance · patient merge orchestration · document
management · MinIO/object storage · communications · insurance · custom patient fields ·
advanced reporting · custom role designer · per-user permission exceptions.

`user_permission_exception` already exists in the schema and is read on every permission check.
It is **frozen**: do not extend it, do not build UI for it. Remove the read only if it shows up
as a real cost.

## Acceptance test

A receptionist can:

1. Register a fictional patient
2. Be warned about a probable duplicate
3. Find the patient by Persian name, by mobile, or by patient number
4. Open the full patient profile
5. Correct the address or contact details, and see the change recorded in the audit trail
6. Be prevented from seeing the record when unauthorized (proved by a denial test, not by hope)
7. Export essential patient information
8. Have the record come back from a tested backup

## Security requirements

Every new endpoint carries `@RequirePermission` and ships with a denial test. No field may be
added to a response without checking whether it is permission-gated. Audit every mutation.

## Data and migration impact

Migrations must be reversible (up/down/up proven) and must not depend on a later release.
Backup impact is reviewed for any new table; if the data shape changes materially, re-run the
restore drill in `06-operations/02-backup-recovery.md`.

## Deployment and rollback

Definition of Done includes deployment instructions, environment configuration, migration
verification, and a documented rollback. Unfinished functionality must not be visible in the UI.

## Blocked on a person, not on code

Real patient data stays prohibited until the **Real-Data Authorization Gate**
(`05-quality/01-security-privacy.md`) is approved. Any "controlled period" trial of this release
depends on that gate; it has never been scheduled.
