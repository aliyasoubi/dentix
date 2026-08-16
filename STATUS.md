# Dentix — Where Things Actually Stand

Plain-language status, kept current as the project moves. If you only read one document to
understand "what has been built and why," read this one — everything else in `docs/` describes
the target design (mostly for features that don't exist yet) or gives an AI/engineer the detail
needed to resume work, not a quick answer to "where are we."

Last updated: 2026-08-16.

## The one-paragraph version

Dentix is a dental practice-management system for one Iranian office. Building it is split into
phases (see the table below). The **first phase** — proving the hard technical stuff works
(login, Persian dates, Persian/Arabic text, rial/toman money, PDF generation) using the smallest
possible real feature — is functionally done, and the app is deployed behind Caddy with
automated encrypted backups. Work has moved on to **Release 1** foundation pieces: real
roles/permissions, and patient-registry fields (national code, address).

Two caveats on that, both real:

- The hosting decision (ADR-010) was made in practice — there is a running production stack —
  but ADR-010 and ADR-006/007/009 are still formally marked *Proposed*, and each carries an
  acceptance checklist that only the named approver can sign off. Deployment ran ahead of that
  governance step. Closing it is a human decision, not more engineering.
- Release 1 is genuinely started but far from finished, and the release-blocking gaps below are
  the honest list.

## What you can actually do in the app right now

- Log in with a username, password, and a 2FA code (real authentication, not a mock)
- Create a patient with a Persian name, an optional Latin name, and a phone number
- Search for that patient by name or by phone (typed as `09…`, `+98…`, or in Persian digits)
- Pick a birth date on a Persian (Jalali) calendar
- Optionally record a national code (checksum-validated) and a structured address — **write-only
  so far**: there is no patient detail screen, so neither can be viewed, edited, or searched
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

| Phase                         | Delivers                                                                                                                                            | Status                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Release 0.5                   | Prove login, Persian dates, RTL, money, PDF generation, and the API/database plumbing all work, using patient create/search as the one test feature | Functionally complete; ADR sign-off outstanding     |
| **Release 1 (we are here)**   | Real patient management + a _basic_ appointment schedule                                                                                            | In progress — see the blocking list below           |
| Release 2                     | Full front-desk scheduling — "reception runs a whole day without spreadsheets"                                                                      | Not started                                         |
| Release 3                     | Clinical charting — documenting what happened in an appointment                                                                                     | Not started                                         |
| Release 4                     | Treatment plans, patient follow-up, lab-order tracking                                                                                              | Not started                                         |
| Release 5                     | Patient billing — charges, payments, refunds                                                                                                        | Not started                                         |
| Release 6                     | Production-readiness hardening                                                                                                                      | Not started                                         |
| Release 7                     | Piloting with the real office                                                                                                                       | Not started                                         |

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

## What's actually blocking progress

Hosting is no longer the blocker — a production stack is running. What stands between here and
using this with real patient data, from an external review of the current `master`:

1. **~~Patient endpoints bypassed permission checks~~ — fixed.** Any active office member could
   read or create patient records regardless of role, because `PermissionGuard` existed but was
   applied to no route. Now enforced, with denial tests.
2. **~~Added users got no role~~ — fixed.** Adding a user now requires choosing one of the six
   roles, written in the same transaction as the membership.
3. **Backups do not include Keycloak.** Keycloak lives in a separate `keycloak` database and the
   backup job dumps only the Dentix one, so a host loss would restore patient records but lose
   every user, credential, and 2FA enrolment. **This is the most serious open item.**
4. **Backup/restore briefly writes an unencrypted dump to disk** before encrypting it (and the
   reverse on restore). An abrupt kill in that window leaves patient data in the clear.
5. **The API holds Keycloak's master admin password**, so compromising the API compromises the
   identity provider. Needs a realm-scoped service account, or removing user-linking from the
   API entirely.
6. **ADR-006/007/009/010 are still formally *Proposed*** while the technologies they cover are
   deployed. A person has to accept them; the acceptance checklists are in each ADR.

Items 1 and 2 are done. Items 3–5 are engineering work; item 6 is a human decision.

Beyond those, national code and address can currently be *entered* but not viewed, edited, or
searched — there is no patient detail screen yet. That's the next feature gap worth closing
before adding further demographic fields.

## Where to go for more

- **How to actually run this on your machine**: `README.md`
- **The itemized technical checklist**: `docs/07-plans/release-0.5-walking-skeleton.md`; the
  evidence and bug write-ups behind each item: `docs/08-implementation/release-0.5-log.md`
- **The full target design** for everything not built yet: `docs/04-architecture/00-software-design-document.md`
