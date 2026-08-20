# Dentix — Where Things Actually Stand

Plain-language status, kept current as the project moves. If you only read one document to
understand "what has been built and why," read this one — everything else in `docs/` describes
the target design (mostly for features that don't exist yet) or gives an AI/engineer the detail
needed to resume work, not a quick answer to "where are we."

Last updated: 2026-08-17.

## The one-paragraph version

Dentix is a dental practice-management system for one Iranian office. Building it is split into
phases (see the table below). The **first phase** — proving the hard technical stuff works
(login, Persian dates, Persian/Arabic text, rial/toman money, PDF generation) using the smallest
possible real feature — is functionally done, and the app is deployed behind Caddy with
automated encrypted backups. Work has moved on to **Release 1** foundation pieces: real
roles/permissions, international-patient support (nationality/passport), and patient-registry
fields (address).

Two caveats on that, both real:

- The hosting decision (ADR-010) was made in practice — the production Compose stack has been
  rehearsed end to end, though only on a developer machine, not on a real server the office
  would use —
  but ADR-010 and ADR-006/007/009 are still formally marked _Proposed_, and each carries an
  acceptance checklist that only the named approver can sign off. Deployment ran ahead of that
  governance step. Closing it is a human decision, not more engineering.
- Release 1 is genuinely started but far from finished, and the release-blocking gaps below are
  the honest list.

## What you can actually do in the app right now

- Log in with a username, password, and a 2FA code (real authentication, not a mock)
- Create a patient with a Persian name, an optional Latin name, and a phone number
- Mark a patient as a foreign national — the identifier field switches from an Iranian national
  code (checksum-validated) to a passport number (format-validated) accordingly
- Search for that patient by name, by phone (typed as `09…`, `+98…`, or in Persian digits), or by
  exact patient number — debounced, and a slow response for an old search can no longer overwrite
  results for a newer one
- Pick a birth date on a Persian (Jalali) calendar
- Optionally record a national code/passport number (validated), an email address (validated), an
  occupation, a referral source, and a structured address
- Click through from a search result to a **patient detail page** — status, identifier, address,
  and contact details, all now visible in one place (still can't be searched by the identifier's
  own value — only by name/phone/patient number)
- **Correct a patient's demographics** from that detail page — name, phone, email, identifier,
  address, occupation, referral source — with the change recorded in the audit trail; a stale copy
  is rejected rather than silently overwriting someone else's concurrent edit
- Add another office user and assign them one of the six roles, which now actually governs what
  they can do
- See rial/toman amounts formatted correctly in Storybook (not wired into a real screen yet —
  there's no billing feature yet to wire it into)
- Generate a Persian PDF receipt from the command line (not wired into the UI yet, either)

That's the whole list. There is no scheduling, no clinical charting, no treatment plans, no
follow-up tracking, no lab-order tracking, and no patient ledger/billing anywhere in the app —
not even a placeholder screen. If a screen for one of those doesn't work, that's not a bug to
report — it doesn't exist yet.

## What's actually built vs. what's left

Each row below names the **office outcome** it delivers, not the architecture it contains, and
every numbered release must stay usable if nothing after it is ever built. A later release may
add capability; it must never finish fundamentals an earlier one left broken.

| Phase                               | Standalone office outcome                                                              | Status                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Release 0.5                         | Prove the risky technical stack end to end (login, Jalali dates, RTL, money, PDF)      | Functionally complete; ADR sign-off outstanding |
| Foundation Recovery Sprint          | Secure, recoverable platform. **Not a product** — an office cannot use this on its own | Engineering done; governance items open         |
| **Release 1 — Patient Book (next)** | Replaces the patient spreadsheet or paper index                                        | Not started as a release; some pieces exist     |
| Release 2 — Appointment Book        | Replaces the appointment notebook — reception runs a whole day in Dentix               | Not started                                     |
| Release 3 — Treatment Record        | Dentist records a common treatment from planning to completion                         | Not started                                     |
| Release 4 — Follow-up Centre        | No implant, orthodontic or lab case is left without a next action                      | Not started                                     |
| Release 5 — Patient Finance         | Patient charges, payments and balances reconcile (optional; must not block 1–4)        | Not started                                     |
| Later                               | Production-readiness hardening, then piloting with the real office                     | Not started                                     |

## Why there's so much code for so few visible screens

Everything built so far is infrastructure every later release needs, proven once instead of
being risked mid-feature later:

- **Login** — real password + 2FA through a proper identity provider, with a secure session.
  Every future screen just plugs into this; nobody has to solve login again.
- **Persian calendar dates** — converts correctly between the Persian calendar shown on screen
  and the plain dates stored in the database, checked against real calendar edge cases (leap
  years, Persian New Year). Scheduling and treatment timelines will both need this exact system.
- **Rial/toman money** — handles Iranian currency without the rounding errors that plague
  naive implementations. Billing will be built directly on this.
- **Persian PDF generation** — renders Persian text correctly in a PDF (this is genuinely hard
  to get right — connected letterforms, correct left-to-right embedding for Latin names). Future
  receipts and printed treatment plans reuse this instead of a second, different PDF system.
- **The module structure itself** — the codebase is split into independent pieces with rules
  enforced by automated checks, so a future scheduling feature literally cannot reach into
  patient-record internals by mistake. This is what keeps five more releases of features from
  turning into an unmaintainable mess.
- **The API contract system** — every future screen automatically gets typed, correct
  frontend code generated from the backend, instead of the two silently drifting apart over time.

None of that shows up as a feature you can click on. That trade-off — a lot of invisible
groundwork for one visible screen — was made on purpose, not by accident, but it's a fair thing
to find frustrating if you were expecting to see product features by now.

## Rough edges worth knowing about

- **The design system wasn't actually being applied until recently.** A real bug — not a
  matter of taste — made Angular Material's own component styling silently not load at all
  (buttons rendered as invisible plain text, etc.). Fixed; see
  `docs/08-implementation/release-0.5-log.md` for the technical detail if you want it.
- **The integration test suite used to wipe your local login and any patients you created by
  hand** — it shared one database with interactive testing. Fixed: tests now run against a
  separate `dentix_test` database, created and migrated automatically. See the README for detail.
- **The Angular Material theme is intentionally spare** — teal/clinical color palette, Persian
  Vazirmatn font, minimal decoration. That's the actual design direction (`docs/03-ux/05-ui-design-system.md`),
  not an unfinished skin.

## Foundation Recovery Sprint

Hosting is no longer the blocker — the production stack runs, albeit only as a local rehearsal
so far, never on an office server. What was blocking was a set of
trust defects found by an external review of `master`. This work is **not a product release**:
it makes the platform safe to build on, but on its own it is not something a dental office can
use. Calling it "Release 1" is what let horizontal infrastructure work look like progress.

Engineering items — all now done:

1. **~~Patient endpoints bypassed permission checks~~.** Any active office member could read or
   create patient records regardless of role: `PermissionGuard` existed and was applied to no
   route. Now enforced, with denial tests.
2. **~~Added users got no role~~.** Adding a user now requires one of the six roles, written in
   the same transaction as the membership.
3. **~~Backups excluded Keycloak~~.** Keycloak lives in its own database and the job dumped only
   the Dentix one, so a host loss would have restored every patient record and lost every login.
   Both databases are now backed up.
4. **~~Backup/restore wrote plaintext dumps to disk~~.** Both directions are streamed
   (`pg_dump | gpg`, `gpg | pg_restore`), so cleartext never touches the volume.
5. **~~The API held Keycloak's master admin password~~.** Replaced with a realm-scoped service
   account whose only permission is `view-users` — verified unable to create users, reset
   credentials, or read the master realm.
6. **~~Restore drill~~.** Both databases restored into isolated targets, the source Keycloak
   destroyed, and a user logged in with password **and TOTP** against a Keycloak that knew only
   the backup. Procedure and its two traps are written up in `06-operations/02-backup-recovery.md`.

Still open, and **not** engineering work:

- **Branch protection.** `master` accepts direct pushes, so CI reports failures after the fact
  instead of preventing them landing.
- **ADR-006/007/009/010 are formally _Proposed_** while the technologies they cover are deployed.
  Each carries an acceptance checklist only the named approver can sign.
- **The Real-Data Authorization Gate** (`05-quality/01-security-privacy.md`) has never been
  scheduled. Until it is approved, everything here stays fictional-data only — including any
  "controlled period" trial of Release 1.

## Release 1 — Patient Book

The first release that is a _product_: it must replace the office's patient spreadsheet or paper
index, and stay useful even if nothing after it is ever built. Not started as a whole; some
pieces exist.

The rule that governs it: **a patient field is not done until it can be entered, validated,
stored, displayed, edited, authorized and tested.** The identifier (national code/passport) and
address now satisfy that — the patient detail page and its edit form closed the gap they used to
fail on (2026-08-17). They still can't be _searched_ by their own value (only by name/phone/
patient number), which is a separate, smaller gap.

Also missing for an office to actually operate it: **roles can be granted at onboarding but
never changed.** There is no way to fix a wrong role, or to see who holds what, short of SQL.

## Where to go for more

- **How to actually run this on your machine**: `README.md`
- **The itemized technical checklist**: `docs/07-plans/release-0.5-walking-skeleton.md`; the
  evidence and bug write-ups behind each item: `docs/08-implementation/release-0.5-log.md`
- **The full target design** for everything not built yet: `docs/04-architecture/00-software-design-document.md`
