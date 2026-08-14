# Release 0.5 — Implementation Log

Detailed evidence and narrative for each item in `07-plans/release-0.5-walking-skeleton.md`. That
checklist stays short and scannable on purpose; this file is where the proof, the bugs found, and
the reasoning actually live. Sections match the checklist's items in the same order.

## Post-S8 hardening pass (independent code review)

An independent review of the whole working tree turned up nine real defects, none of which the
green test suite had caught. Fixed together, with regression tests for each:

1. **No request validation existed at all.** `class-validator` wasn't a dependency and no
   `ValidationPipe` was registered, so the DTOs were decorative. `POST /patients` with
   `phone: 123` crashed with a 500 at `command.phone?.trim()`; `sex: "banana"` got as far as the
   database CHECK constraint; and `contactUnavailable: "no"` — a truthy string — **silently
   bypassed the CONTACT_REQUIRED rule**, creating a patient with no contact method. Added a
   global pipe (`whitelist` + `forbidNonWhitelisted` + `transform`, with
   `enableImplicitConversion` deliberately OFF so `"no"` can't be laundered into a boolean).
   Registered as `APP_PIPE` in `AppModule` rather than via `main.ts`, because every api-spec
   builds its own app from `AppModule` — an entry-point-only pipe would leave the tests
   exercising a different pipeline than production, which is precisely how "no validation at
   all" stayed invisible to a green suite. Validators are type-level only: domain rules keep
   their own stable codes rather than collapsing into one generic error.
2. **The Swagger production gate was fail-open** — a bug introduced earlier in this same
   session. It gated on `NODE_ENV !== "production"`, but `NODE_ENV` is set nowhere in the repo
   and `start:prod` is a bare `node dist/src/main`, so `undefined !== "production"` is true and
   `/api/docs` would have mounted in production. Now an explicit `ENABLE_API_DOCS=true` opt-in:
   a gate on an externally reachable surface has to fail closed.
3. **A successful create could be reported as a failure.** `submit()` awaited the list refresh
   *inside* its own try/catch, so a failing refresh after a committed create rendered a
   creation error — the user retries and creates a **duplicate patient**. The refresh now sits
   outside the create's error handling, where it belongs.
4. **Search failures were swallowed.** `runSearch` was try/finally with no catch: the stale list
   stayed on screen looking current, and the constructor/keystroke callers produced unhandled
   rejections. Now clears rows and shows an error.
5. **No 401 recovery.** The interceptor had no error branch and `authGuard` never re-checked
   (`sessionChecked` was never reset), so after an idle timeout or force-revoke the SPA stayed
   "authenticated" while every call 401'd. Added `markSessionExpired()`, wired through the
   interceptor — with `whoami`/`logout` excluded, since a 401 from the session *probe* is a
   normal answer and reacting to it would recurse.
6. **`%` and `_` in a search were treated as SQL wildcards** — searching `%` returned every
   patient in the office. Parameterized, so never an injection risk, but wrong results. Escaped
   with an explicit `ESCAPE` clause.
7. **Rate limiting counted the proxy, not the client.** `trust proxy` was never set although the
   documented deployment puts nginx/Caddy in front, so ThrottlerGuard bucketed the entire office
   under one IP — one person's redirect loop would lock out everyone. Now opt-in via
   `TRUST_PROXY_HOPS`; opt-in and not default-on, because trusting `X-Forwarded-For` with
   nothing actually in front lets a caller spoof themselves a fresh bucket per request.
8. **Logout failed silently** — a 401 (session already gone) left the user on an unchanged
   screen with no redirect. Now clears local state and heads to login either way.
9. **A misleading security comment** claimed `deriveMfaContext` returning null causes the caller
   to reject the login. It does not — the caller records it and proceeds. Corrected to describe
   the actual, already-documented behavior.

Two further things this pass fixed in the tooling itself:

- **`openapi:check` gave a false failure on staged-but-uncommitted files.** It used
  `git status --porcelain`, which reports a staged file as changed even when its content is
  exactly what regeneration produces. Replaced with a trackedness check plus
  `git diff --exit-code`, which is correct both in CI (nothing staged) and locally.
- **Client-side validation now mirrors the server's rules**, reusing the kernel's own
  `canonicalizeIranianMobile` rather than a second hand-written regex — a duplicated copy of
  "what counts as an Iranian mobile" is exactly how client and server drift into disagreeing.

## Second hardening pass — a wider independent review, and two ADR checklist items closed

Continued the same review discipline over the modules the first pass didn't touch
(`identity-access` guards/session store, `office-administration`, `audit`, shared platform
guards/filters, plus a cross-module grep for `console.log`/raw `any`/TODOs and untransacted
mutations). One real, genuinely severe finding, one gap noted for awareness, and two smaller
things found while fixing the first:

1. **CSRF token comparison was timing-unsafe.** `CsrfGuard` compared the presented token's hash
   against the session's stored hash with plain `!==` — the one place in the module a hash is
   compared directly in application code; everywhere else (session cookie, OIDC `state`) the
   comparison is implicitly a DB index lookup by hash, not a string comparison in JS. `!==`
   short-circuits at the first differing byte, which in principle lets an attacker who can fire
   many CSRF-guarded requests (e.g. `POST /auth/logout`) and measure latency recover
   `csrfTokenHash` byte by byte, then forge a header for a token they never saw. Fixed with
   `crypto.timingSafeEqual` behind a new `SessionTokenService.verifyHash()`, length-checked
   first since `timingSafeEqual` throws rather than compares on a length mismatch.
2. **`office-administration` module has no consumer** — `OfficeRepository`/`Office` are
   exported but nothing outside the module calls `.create()`; offices currently only come into
   existence via a migration/seed script, not application code. Not a bug, flagged for
   awareness: worth confirming this is the intended shape (pre-seeded office) before a real
   office-onboarding flow is designed.
3. **`markSessionExpired()` (the previous pass's 401 fix) only cleared local state — it never
   redirected.** The app shell's logout button, and with it the only visible link back to
   login, renders `@if (auth.isAuthenticated())`; once that flips false after a stray 401 there
   was no other path back to login short of manually editing the URL. Now reuses the same
   redirect `authGuard` already performs for "no session", landing the user back at their
   current location as `returnTo`.
4. **ADR-006 and ADR-007's acceptance checklists were stale**, not incomplete: both items they
   still listed as unproven were actually already proven by work already in the tree.
   - ADR-006: "map an entity ORM ↔ domain ↔ API through explicit mappers" was written before
     the patients slice existed. It's proven now — `PatientOrmEntity` → `PatientMapper` →
     domain `Patient` → `CreatePatientUseCase` → `CreatePatientRequestDto`/
     `CreatePatientResponseDto`. 4 of 5 proven; the remaining item (money DB↔API round trip)
     is genuinely blocked on the finance feature, not stalled.
   - ADR-007's provider-logout item was already closed in the first pass's evidence.

Testing note: `AuthService`'s tests were rewritten mid-pass — jsdom in this project's version
fully blocks `location.href` reassignment (logs "Not implemented: navigation", leaves the
property unchanged), so asserting on `window.location.href` after `login()`/`logout()` was
silently testing nothing. `login()`/`logout()` now route through a private `redirectTo()`, and
the tests spy on that instead.

## Monorepo scaffold

S1: never ticked when S1 actually landed even though its own "Done when" line named this
checkbox — corrected later, no new work involved.

## Docker-compose dev environment

S1: same as above — Postgres + Keycloak landed in S1, MinIO followed in S7 exactly on the
schedule `00-build-sequencing.md` predicted. Redis remains genuinely not needed yet.

## ADR-008: Jalali date adapter library

S5: Accepted — jalaali-js for the kernel's pure conversions, date-fns-jalali scoped to the
Material adapter. See the ADR's own implementation note for the full reasoning.

## S4 end-to-end slice (login → create patient → search)

Proven in a real browser: real Keycloak login with MFA, patient created with a Persian native
name + Latin name + phone, found again by phone in all three accepted forms (`09…`, `+98…`,
Persian digits) and by a partial name typed with the Arabic Yeh variant, RTL layout correct
throughout, session survives a hard reload, logout ends both the local and Keycloak SSO session.

## Angular Material theme (UX-DS-001 §24) and three real rendering bugs

**First pass** (post-S8, direct response to user feedback that the patients screen looked
unstyled): the Material theme, tokens, and the S4 page were already RTL/Vazirmatn-correct, but
nothing beyond global tokens had actually been applied — no page header, no empty state, generic
Material defaults throughout. The checklist's own "density -1" wording turned out to be wrong
against the spec's own §8.3, which mandates two density modes chosen per screen — "Comfortable"
for patient registration (the only screen that exists) and "Compact" reserved for
schedule/ledger/clinical-timeline screens that don't exist yet — not one global compact scale.
Corrected `styles.scss` to `scale: 0` (Comfortable) instead of blindly keeping an earlier `-1`
change that was based on §24's illustrative example without cross-checking §8.3.

Also added the §9.1 radius tokens, §9.2 elevation tokens, and §7.2 type scale (as `.ds-text-*`
utility classes) that were missing entirely; fixed the app toolbar from a solid brand-color
background to the "quiet neutral surface" §10.3/§6.4 actually require; built
`DsPageHeaderComponent` and `DsEmptyStateComponent` (both named in §28's required-components
list) and applied them, plus the type scale and §9 radius rules, to the real patients page —
restyled `patients-page.html`/`.scss` accordingly. Not the full app shell/sidebar (§10) — that's
genuinely premature with one page in the whole app and is deferred honestly, not silently
skipped.

**Second, more serious bug** — found immediately after, from direct user testing ("the UI is
very buggy"): `styles.scss` called `mat.theme($dentix-theme)`, which only applies Angular
Material's core/system-level tokens (base + color + density + typography) — it never includes
any individual component's own theme mixin (button-theme, checkbox-theme, table-theme,
select-theme, ...). Confirmed via `getComputedStyle` in a real browser, not assumed: a disabled
submit button's `--mdc-filled-button-disabled-label-text-color` and every other
`--mdc-filled-button-*` custom property were empty strings, so the button rendered as plain
unstyled text with no visible shape — and every other Material component on every page was
silently missing its real theme CSS the same way. `mat.all-component-themes($dentix-theme)` —
literally what §24's own illustrative example already showed — includes `core-theme`'s `theme()`
first and then every component's theme on top, confirmed by reading Angular Material 22's own
`_all-theme.scss` source, not guessed. Fixed; the built CSS bundle grew from 3.28 kB to 55.75 kB,
numerically confirming the previously-missing component CSS is now actually shipping. Verified in
a real browser: the submit button now shows a correct filled brand-teal pill when enabled and a
correct muted-gray pill when disabled, on both the patients page and the login page.

**Third bug** — found right after (user report: "persian date calendar component doesn't have
any background"): `mat.define-theme`'s neutral/surface palette is algorithmically derived from
`mat.$cyan-palette` (Material's own M3 color science), not from `--ds-*` — confirmed by reading
Angular Material's own `_definition.scss`, not assumed — so the datepicker popup and the select
dropdown both rendered a washed-out greenish-gray background barely distinguishable from
`--ds-page`, reading as "no background." The datepicker's own generated elevation-shadow token
was separately baked into the compiled CSS at zero blur/spread (confirmed by grepping the actual
build output), so it cast no shadow at all. Fixed by overriding the specific component tokens
Material actually renders from
(`--mat-datepicker-calendar-container-background-color`/`-text-color`/`-elevation-shadow`,
`--mat-select-panel-background-color`) with the real `--ds-*` values, per §24's own instruction
to layer product tokens above the Material theme rather than fight Sass palette generation.
Verified live: both the calendar popup and the gender select now show a clean white surface with
a real visible shadow.

## Motion system and focus indicators (§23, §26 Stage 1, §27 DoD)

Requested directly ("needs animation and modern feel"). Investigation first found that §23's
motion layer had never been implemented at all: **zero** motion tokens in `styles.scss`,
`--ds-focus-ring` declared in §6.1 and referenced nowhere in the app, exactly one `:hover` rule
in the entire codebase (a table row), and no `prefers-reduced-motion` handling despite §27's DoD
requiring it.

Built, all spec-sourced rather than invented:

- **§23.2 motion tokens** — the five durations and three easing curves, verbatim from the spec.
  Feature styles pick from §23.3's matrix (hover/press 80–120ms, menu 120–160ms, panel
  200–220ms) instead of hand-picking numbers.
- **§23.7 reduced motion** — neutralizes *duration*, never the state change itself, so a
  hover/selected/error state still applies instantly for users who ask for reduced motion
  (§23's own closing rule: "Functional feedback must remain available without animation").
- **Keyboard focus ring** — `:focus-visible` at 2px in `--ds-focus-ring`, finally using that
  token.
- **Table row hover** at `--ds-motion-instant` (80ms). Deliberately *not* animating row
  enter/exit on search: §23.6 explicitly rules motion out for "every table update," so a
  keystroke-driven re-render must stay still.

**Two things worth recording because the obvious approach was wrong:**

1. `mat.strong-focus-indicators()` looked like the right supported API and **does not work on
   its own**. It emits only CSS custom properties plus a chip overflow fix; the structural rules
   live in a separate `strong-focus-indicators-structure()` mixin, and they key off
   `.mat-focus-indicator:focus-visible` — where `.mat-focus-indicator` is an inner `<span>`
   Material renders inside the button, which has no tabindex and therefore can never match
   `:focus-visible`. Caught by grepping the compiled bundle (zero structural rules shipped) and
   by `getComputedStyle` on a real focused control, before claiming the fix worked. Replaced
   with a plain `:focus-visible` rule on whatever element actually holds focus.
2. That rule then still didn't paint, because Material resets `.mdc-button { outline: none }` at
   *equal* specificity (0,1,0) and simply loads later, winning on cascade order — confirmed by
   enumerating matching CSSOM rules on a real focused button. Hence the `!important`, which is
   justified here specifically: a keyboard focus ring is an accessibility requirement, not a
   stylistic preference, and must not be silently suppressible by a component reset. Material
   form fields are then explicitly exempted (they render their own brand-colored focus outline;
   a second ring inside reads as a box in a box — confirmed visually).

Verified in a real browser via keyboard tabbing: non-form-field controls (buttons, checkbox)
render `solid 2px rgb(72, 175, 190)` — i.e. `--ds-focus-ring` — at a 2px offset; form-field
inputs correctly render `outline: none` and keep Material's own affordance.

## Storybook + first Ds components

S6: Storybook itself is running against the real design tokens/`styles.scss`/Vazirmatn/i18n
resources, and `DsMoneyDisplayComponent` is built, tested, and demonstrated in it — see the
money-input entry below.

Post-S8: `DsStatusChipComponent` (`apps/web/src/app/design-system/status-chip/`) closes the
pair — the six UX-DS-001 §13 tones (neutral, neutralSubdued, info, warning, success, danger)
mapped onto the existing `--ds-*` semantic color tokens (no new tokens invented), unit-tested per
tone, and demonstrated in Storybook with the spec's own state-family labels
(Planned/Active/Pending/Completed/Cancelled/Overdue) — `npm run build-storybook` verified green
with both components present, not just assumed from the dev server.

## Public bootstrap loader

Post-S8: `GET /api/v1/bootstrap` (`apps/api/src/bootstrap.controller.ts`) — unauthenticated, per
`06-configuration-catalog.md` Layer 4 — serves the fixed v1 locale/dir/calendarDisplay plus the
office timezone and money unit, currently backed by fixed constants rather than a live Layer-2
settings store, since no admin config UI exists yet to write one (the DTO's own comment states
this honestly). `BootstrapConfigService` (`apps/web/src/app/core/bootstrap/`) fetches it as an
`APP_INITIALIZER` before the shell renders, throws on any mismatch against the expected
fa-IR/rtl/JALALI values rather than trusting the response blindly, and feeds the real
`MONEY_CONFIG` provider — replacing the placeholder default that token's own comment flagged as
temporary. Verified against the real running API, not just unit-mocked: `curl
localhost:3000/api/v1/bootstrap` returns the exact expected JSON, and a real browser load shows
the request succeed with zero console errors and the app proceeding to the login redirect, which
an initializer failure would have blocked.

## Working Jalali date picker

S5: `JalaliDateAdapter` wired into the S4 patient form's date-of-birth field; kernel's 33-fixture
suite plus 14 adapter unit tests plus a real-browser human check — picked فروردین ۱۴۰۳/۱ (Nowruz,
a leap year) via the picker, submitted, and it round-tripped back through Postgres and the API as
۱۴۰۳/۰۱/۰۱ in the search results.

## Rial/toman money input component

S6: `packages/kernel/src/money.ts` — a nominal `Money` branded type (same `Branded<>` pattern as
`Uuid`, `asMoney`/`tryAsMoney` matching `asUuid`/`isUuid`) over bigint-only rial/toman conversion,
decimal-string API boundary, and Persian/Latin-digit entry parsing; both example tests and
property-based tests via fast-check (~1,100 randomized cases/run for toman↔rial exactness,
no-silent-rounding, and decimal-string round trip — 147 kernel tests total).
`DsMoneyDisplayComponent` + `DsMoneyInputComponent` (`apps/web/src/app/design-system/money/`) are
typed `Money`, not a bare bigint, end to end; demonstrated in Storybook and proven in a real
browser — typed `2500000` and ۲٬۵۰۰٬۰۰۰ (Latin and Persian digits) into a toman-configured field,
both produced the identical "معادل ثبت‌شده: ۲۵٬۰۰۰٬۰۰۰ ریال" equivalent; the تومان/ریال unit
label has no UI path to hide it; an ambiguous decimal (`2500.5`) was rejected with a visible
validation message instead of guessed at.

A follow-up quality pass (P1/P2) additionally closed a real defect this same checklist item's
human check didn't happen to exercise: a canonical amount that isn't a whole number of tomans
used to display raw rial digits under a تومان suffix — see the commit history for the fix and its
regression tests.

## One generated PDF (Persian receipt)

S7: new `apps/worker` package — headless-Chromium HTML→PDF (Playwright), Vazirmatn embedded as
base64 `@font-face` (no network fetch at render time), MinIO added to the dev stack for
content-addressed object storage. Human-reviewed the actual rendered PDF: connected Persian
letterforms, the Latin name unmirrored inside RTL flow, Persian-digit Jalali date, grouped toman
amount, the receipt-number code correctly left un-converted. Along the way, found and fixed a
real Chromium non-determinism — see ADR-009's implementation note. ADR-009's other two checklist
items: content-hash reproducibility is now proven; running on the actual ADR-010 host stays open
until ADR-010 is decided.

## OpenAPI generated from NestJS, typed Angular client

S8: `apps/api/scripts/generate-openapi.ts` boots the real `AppModule` with `@nestjs/swagger`'s
`SwaggerModule.createDocument` — not a hand-maintained subset — and writes `apps/api/openapi.json`;
`HealthController` is `@ApiExcludeController()`'d since it's explicitly outside `/api/v1`.
`apps/web` runs `openapi-typescript` against that committed contract into
`src/app/core/http/api-types.gen.ts`; `PatientsApiService` (the S4 page's client) now types its
request/response shapes directly off `components["schemas"][...]` from that generated file
instead of hand-duplicated interfaces. `npm run openapi:check` (both workspaces, wired into CI)
regenerates both artifacts and fails on any uncommitted drift — verified failing on a
deliberately un-synced file before wiring the fix, not just assumed.

A real defect this caught along the way: `@ApiPropertyOptional` on a `string | null` request
field reflects as `type: object` unless `type: String` is given explicitly (TypeScript's
decorator-metadata reflection collapses union types to `Object`) — `CreatePatientRequestDto`'s
`latinName`/`phone`/`dateOfBirth` would otherwise have generated as opaque objects, not strings,
in the Angular client.

The generic `amountRial` string→`Money` client adapter
(`apps/web/src/app/core/http/money-codec.ts`) is built and unit-tested per this slice's test
list, ahead of any endpoint actually returning `amountRial` — there isn't one yet in Release 0.5.

Post-S8, a live Swagger UI was also mounted at `/api/docs` (dev/staging only, gated off in
production) so the contract is browsable, not just a committed JSON file — `main.ts` and the
generator script now share one `buildOpenApiDocument()` helper so the two can't drift apart.

## Third hardening pass — brand-derived Material theme (closing a known gap)

A gap flagged but deliberately left open in the last commit: the theme ran two disconnected
color systems. `styles.scss` fed `mat.define-theme` two arbitrary stock M3 palettes
(`mat.$cyan-palette` for primary, `mat.$blue-palette` for tertiary) that have no relationship to
each other or to the actual brand color, while UX-DS-001 §6.1 specifies a real one:
`--ds-brand-600: #187381`. The practical result — confirmed, not assumed, via `getComputedStyle`
on a real submit button and by grepping the compiled bundle — was that every Material component
internal not already covered by this project's own `--ds-*` overrides (ripples, unstyled
components, anything not deliberately re-themed) rendered `#006a6a`, a real and visibly different
teal from the brand's `#187381`. Re-theming meant hunting down two unrelated palette choices by
hand, the opposite of "easily changeable".

Fixed by generating an actual M3 palette from the real brand hex, using the same tool Angular
Material's own docs point to for a custom brand rather than one of the twelve stock hues:

```bash
npx ng generate @angular/material:m3-theme --primary-color="#187381" --directory=src/styles --is-scss --defaults
```

This runs Google's Material Color Utilities (HCT color space) against the seed and writes
`apps/web/src/styles/_theme-colors.scss` — `$primary-palette`/`$tertiary-palette` tone maps,
committed like any other source file (not regenerated at build time; re-run the command with
`--force` to re-theme). `styles.scss` now passes `brand.$primary-palette`/`brand.$tertiary-palette`
into `mat.define-theme` instead of the two stock palettes. Verified in a real logged-in browser
session, not just the compiled bundle: the submit button's computed `background-color` is
`rgb(0, 104, 118)` (`#006876`, the seed's derived tone-40), and the earlier datepicker/select
overlay `--mat-*` overrides (still necessary — Material's own neutral tone ramp and this
project's hand-picked `--ds-surface`/`--ds-border` remain two independently-authored scales, now
at least agreeing on hue family) continue to render a proper white surface with visible elevation.
Bundle size and lint/test/build stayed unaffected — this only changes which colors the same
theming machinery is fed. §24's own "illustrative structure" code sample in the UX doc still
shows the stock-palette shape (same reasoning as its `density: -1` sample, see above): it
demonstrates `mat.define-theme`'s call shape, not a literal value to copy — it was never the
authoritative color, §6.1 always was.

## Fourth hardening pass — test-database isolation, and the js-yaml advisory investigated properly

**`test:int`/`test:api` no longer touch the dev database.** They previously ran against the same
`dentix` Postgres database used for interactive dev/manual testing, `TRUNCATE ... CASCADE`-ing
`office`, `office_user`, `user_account`, and `patient` as part of test cleanup — silently
deleting the dev-bootstrapped login and any manually-created patients, four times in one working
session alone. Fixed with `apps/api/test/support/global-setup.ts` (Jest `globalSetup`, runs once
per suite invocation): creates `dentix_test` on the same Postgres instance if it doesn't exist yet
and migrates it, both idempotent. `set-test-database-env.ts` (`setupFiles`, runs per worker,
before `data-source.ts` reads `POSTGRES_DB` at import time) forces every test process onto that
database regardless of what's in the shell environment, `.env`, or CI's job-wide `POSTGRES_DB`.
`resolveTestDatabaseName()` refuses any override that doesn't end in `_test` — a destructive
suite must never be able to silently point at a database that isn't visibly a test one. Verified
concretely, not assumed: recorded dev-DB row counts (`office_user`/`patient`) before and after a
full `test:int` + `test:api` run, byte-for-byte identical, with `dentix_test` confirmed created
and migrated alongside. CI needed no changes — the override happens entirely inside the two Jest
configs, so it applies there too without touching `ci.yml`'s own `POSTGRES_DB=dentix` (used
correctly, and unaffected, by the separate migration-proof step).

**The js-yaml advisory in `@nestjs/swagger` was investigated, not just noted.** `@nestjs/swagger@11.4.6`
pins `js-yaml@5.2.1` (GHSA-pm4m-ph32-ghv5, exponential-time DoS in flow-collection parsing), with
no newer `@nestjs/swagger` release available that bumps it. A `package.json` `overrides` entry
scoping `js-yaml` to the patched `5.2.3` specifically under `@nestjs/swagger` was tried and
reverted after genuinely failing across three independent clean-install attempts — an incremental
`npm install`, a full `node_modules` wipe, and a fully cold-cache reinstall with `package-lock.json`
itself deleted — every one left `npm ls` reporting the pre-override `5.2.1` as `invalid`, an npm
resolution limitation for this specific nested-override shape, not a mistake in how it was applied.
(The cold-cache attempt separately surfaced a real, pre-existing, unrelated peer conflict —
`openapi-typescript@7.13.0` wants `typescript@^5.x` against this project's pinned `6.0.3` — that the
committed lockfile had been quietly masking; noted here since a future lockfile regeneration will
hit it, but out of scope to resolve as part of this investigation. Recovered with `npm ci` against
the untouched committed lockfile — verified zero drift in `package.json`/`package-lock.json`
afterward.) Before accepting this as a tracked, non-blocking gap, actually checked whether it's
exploitable: grepped `@nestjs/swagger`'s compiled output for every `js-yaml` call site — there is
exactly one, `jsyaml.dump()` serializing this app's own generated OpenAPI document for the
`-yaml`-suffixed docs route. The CVE is in the *parser* (`.load()`/`.loadAll()`), which nothing in
this codebase calls with any input, let alone attacker-controlled input — and that route only
exists at all behind the `ENABLE_API_DOCS` opt-in, itself fail-closed in production. Documented at
the call site in `main.ts` rather than left as a silent `npm audit` line item; revisit when
`@nestjs/swagger` ships a fix.

## CI had been red since S8 — found while containerising, not by watching CI

**The most important defect in this release, and it was self-inflicted.** GitHub Actions had
failed on *every* push since commit `b764197` (S8, the OpenAPI slice). The last green run was
`9178d7a`. Nine consecutive red runs, including every "full gate green" claim made in the
hardening passes above — those claims were true *locally* and were never checked against CI,
which is exactly the gap that let this run for days.

Root cause, and it is a nasty one because it is invisible on the machine that caused it: adding
`openapi-typescript` in S8 regenerated `package-lock.json` on macOS/arm64, and npm (npm/cli#4828)
records only the *current platform's* native binaries as installable lockfile entries. The
regenerated lockfile therefore contained `@esbuild/darwin-arm64`, `lightningcss-darwin-arm64`, and
`@napi-rs/nice-darwin-arm64` — and no Linux equivalents at all. The failure mode is deliberately
quiet: `npm ci` on Linux **succeeds**, having installed no native binding whatsoever, and the
error only appears later as esbuild's `Cannot find native binding` when the web build or Vitest
first tries to run. CI's "Install dependencies" step was green on every one of those nine runs;
"Unit tests" was where it died.

Fixed by declaring the Linux variants as explicit root `optionalDependencies`, which forces them
into the lockfile for every platform; each machine still installs only the variant its own
`os`/`cpu` constraints permit, so nothing extra lands on a developer's Mac. `package.json` carries
a `//optionalDependencies` note recording that these versions must be bumped in lockstep with
`esbuild`/`lightningcss`/`@napi-rs/nice`, because a silent mismatch reproduces the identical
failure.

Two process changes, since the fix alone would not have caught it:

1. **CI now builds the production API image** (`docker build -f apps/api/Dockerfile`). That runs
   `npm ci` inside a clean Linux image, so any future dependency problem that is invisible on a
   developer's machine fails the build directly rather than surfacing as a mysterious runtime
   error — and it verifies the artifact that actually gets deployed, per
   `06-operations/01-deployment.md`'s "versioned API container".
2. **Check CI, don't infer it from a local run.** The local gate and CI are different machines
   with different architectures; "green here" is evidence about here.

Discovered only because containerising the API for ADR-010 ran `npm ci` on Linux for the first
time and hit the identical error — which is itself the argument for having containerised earlier.

## Backup pipeline, drilled against the running rehearsal stack

ADR-010's third acceptance item, and per `07-plans/risks.md` R-04 the single most consequential
gap remaining: losing the host without backups means losing the office's records outright, a
different class of problem than any bug fixed so far.

Built as its own service (`ops/backup/`) rather than a host cron job, on purpose — the whole
point of the Compose stack is that `docker compose up` brings up everything it needs, including
its own backup schedule, without depending on what else happens to be configured on whichever
host it runs on. `pg_dump --format=custom` (matches `pg_restore`'s expectations, unlike a plain
SQL dump), piped to `gpg --symmetric --cipher-algo AES256` with the passphrase read from a
mounted file rather than an environment variable — env vars are readable via `docker inspect`
and `ps aux`, a file mounted read-only is not. The unencrypted dump is deleted the moment
encryption finishes; it must never survive on disk once this runs against real patient data.
A sha256 checksum is written alongside every backup and re-verified by the restore script before
it ever touches the passphrase, so a corrupted or tampered file fails loudly at the integrity
check rather than partway through a confusing `pg_restore` error.

Scheduling is real cron inside the container, not a hand-rolled sleep loop — the one genuine
Docker+cron gotcha (cron jobs don't inherit the container's own environment) is handled by
`entrypoint.sh` capturing `POSTGRES_*`/`BACKUP_*` to a file the cron job explicitly sources.

**Actually drilled, not just built** — the restore procedure was run twice against this
rehearsal's real data (the seeded office/user rows), each into an isolated database
(`restore_drill`, never the live one, per `06-operations/02-backup-recovery.md`'s own restore
procedure):

- Both restores completed in under a second and matched the live database exactly — same office
  UUID, same row counts across `office`/`office_user`/`user_account`, all 5 migrations present.
- Confirmed the file is genuinely encrypted rather than just named `.gpg`: `pg_restore --list`
  against it directly failed ("does not appear to be a valid archive"), and `gpg --list-packets`
  reported `AES256.CFB encrypted data`.
- One honest caveat about that sub-second number: this rehearsal's dataset is walking-skeleton
  scale (no patients — creating one needs an authenticated browser session, which needs the
  CA-trust step that's the operator's to run). A real office's `pg_restore` time will scale with
  data volume, and the full 8-step restore procedure includes incident declaration and integrity
  validation this drill had no incident to exercise. What is proven: the mechanism is correct
  end to end. What is estimated, not measured: RTO against a real dataset and a real incident.

**The gap this pass does *not* close, stated plainly rather than glossed over:** this pipeline
runs once daily, giving up to 24 hours of RPO — not the 15-minute target in `risks.md` R-04 and
ADR-010. Closing that means continuous WAL archiving (pgBackRest or wal-g), which
`00-build-sequencing.md` explicitly places at pre-pilot, not Release 1 — building it now would be
exactly the overengineering that document exists to prevent. Also not done: the off-host copy.
`BACKUP_RCLONE_REMOTE` is unset in the rehearsal, so backups exist only in a Docker volume on the
one host taking them — not a second failure domain by any definition. Configuring a real
destination is the operator's decision, the same category as ADR-010's own hosting choice, and
`ops/backup/rclone.conf.example` is ready for whichever one gets picked.

## First real authorization gate: office admins, add-user, and the recent-authentication check

Started from two plain questions — "is the auth service complete, as in permission roles and
adding a user?" and "does patient registration need this many fields?" — and both turned out to
have a smaller correct answer than the obvious one.

**Permissions: a boolean, deliberately, not the role matrix.** `01-product/04-roles-and-permissions.md`
describes six roles and dozens of permission families, and it is tempting to start building that.
It is also explicitly Release 1 scope (`07-plans/release-1-foundation.md`) and gated on DISC-003,
which no operational or clinical approver has signed. What *was* genuinely missing is narrower:
there was no way to add an office user at all except a dev-only script, and nothing to gate who
may do it. So `office_user` gained a single `is_office_admin` boolean — not a role code, not a
permission table — chosen so it reads as the stopgap it is instead of being mistaken later for
the target design. `OfficeUser.create()` hardcodes it to `false`, which is what makes admin
rights ungrantable through the new endpoint even if a request tried.

**Adding a user links an identity; it never provisions one.** ADR-007 is unambiguous: Dentix
administrators "may link or disable an external identity but never set or view passwords."
`AddOfficeUserUseCase` therefore looks the person up in Keycloak by email through a new
read-only `KeycloakAdminPort` and links them, returning `NOT_FOUND_IN_PROVIDER` when no such
account exists rather than helpfully creating one. Authorization is a fresh `office_user`
lookup inside the use case, not a claim trusted from the session — whoami's `isOfficeAdmin` is
UI convenience, and the route guard in front of the page is convenience too; the use case is
the actual gate. Checks that decide whether to write anything happen *before* the transaction
opens, so the transaction only ever performs unconditional writes: returning a `Result` rolls
nothing back, so a check inside it could leave a `user_account` created while the caller was
told `ALREADY_LINKED`.

**The gap the first pass missed, found by reviewing against the docs rather than the diff.**
`04-architecture/09-authentication-session-architecture.md` lists **permission administration**
alongside clinical signing and refunds as requiring `authenticatedAt` inside the
recent-authentication window, and ADR-007's second acceptance item had deferred that flow to
"whichever slice first needs it." Adding an office user — handing someone access to patient
data — *is* that slice, and the first implementation shipped without the check;
`UserSession.isRecentlyAuthenticated()` had existed since S3 and was wired to nothing. Now:
the use case refuses a stale session with `RECENT_AUTHENTICATION_REQUIRED`, and the SPA offers
a re-authenticate action instead of a dead end.

Three details that are decisions, not incidentals:

- **403, not 401.** The session is perfectly valid; it merely authenticated too long ago. A 401
  gets absorbed by the SPA's generic session-expired interceptor and retried as an ordinary
  login — which the provider answers from its existing SSO session with the *same stale*
  `auth_time`, bouncing the user off the same refusal forever. Locked in by a test.
- **`prompt=login`, not `login`.** Same reason: only forced interactive re-authentication moves
  `auth_time`. `AuthService.reauthenticate()` is separate from `login()` precisely so ordinary
  logins keep reusing SSO.
- **Admin check before the recency check.** Telling a non-admin to go re-authenticate invites a
  round trip that cannot help them, so a stale non-admin still gets `FORBIDDEN`. Also tested.

**Proven in the browser, not just in Jest** (this is ADR-007 acceptance item 2, now ticked): an
admin session was aged six minutes past the window directly in `user_session`; the next add was
refused with the Persian message and the typed email preserved; the re-authenticate action
produced Keycloak's own **"Please re-authenticate to continue"** screen — the actual evidence
`prompt=login` was honored rather than silently satisfied from SSO — demanded password and TOTP
again, returned to `/office-users` via `returnTo`, and the identical add then succeeded and
wrote an `office_user_added` audit event.

**Patient registration: nothing was actually required that shouldn't be.** Checked against
`02-requirements/` before touching anything — only the native name and a contact method (phone,
or an explicit "no contact method" checkbox) were ever mandatory; Latin name, sex, and date of
birth were already optional. The form just *presented* all six at once. They now sit behind a
closed "جزئیات بیشتر (اختیاری)" panel. Pure presentation: no validation, DTO, or schema change.

**A real Angular bug, found only because the flow was walked in a browser.** Guards listed
together in one route's `canActivate` array run **concurrently** — Angular subscribes to all of
them at once and merely combines the results in declaration order (`prioritizedGuardValue`).
`officeAdminGuard` had assumed `authGuard` ran first and left a session behind, so a cold or
deep-link navigation to `/office-users` read `session()` as still `null` and bounced a genuine
admin to `/patients`. Every unit test passed, because each guard was tested alone. It now loads
the session itself, with a regression test naming the concurrency.

**Verification.** `test:api` gained `office-users.api-spec.ts` (12 cases) covering the whole
authorization matrix — no session → 401, missing CSRF → 403, non-admin → 403 `FORBIDDEN`, stale
session → 403 `RECENT_AUTHENTICATION_REQUIRED`, the provider-outcome codes, and that a body
smuggling `officeId`/`isOfficeAdmin` is rejected outright (`forbidNonWhitelisted`) rather than
quietly ignored. Both no-write paths assert nothing was persisted, and the non-admin and stale
cases assert the provider was never even queried, so a caller who fails the gate learns nothing
about which emails exist.

**Two things deliberately left open rather than quietly done:**

- The Keycloak lookup authenticates as the **master-realm admin** to perform what is a read-only
  `view-users` query. It works and is confined to the internal Docker network, but a dedicated
  service account scoped to the `dentix` realm is the least-privilege shape. That is a realm
  configuration change with its own restore-rehearsal burden, so it is named here rather than
  bundled in.
- `office_user` rows can be created and audited, but nothing yet **removes** access or flips
  `is_office_admin`. Deactivation exists in the schema (`is_active`) and is honored at login; no
  endpoint drives it. Both belong with the real role work behind DISC-003.

## ADR-010 decided and proven for real: this machine, over genuine TLS, with a browser that fought back

The host decision had been sitting open since Release 0. Ali chose the on-prem pattern the ADR
already documented as a first-class alternative to a domestic VPS — applied informally to his own
development machine rather than purpose-built office hardware, explicitly to unblock Release 1
rather than wait on a VPS purchase or an office-hardware survey that hasn't happened yet
(DISC-001, still open). Recorded honestly in `adr-010-hosting-operations.md`, including where a
developer laptop diverges from the "office mini-server" the pattern describes: not dedicated
hardware, no UPS, `*.localhost` reachable only from this machine, uptime tied to this laptop's.
DISC-006 (who accepts ADRs) is narrowly resolved the same way — Ali, as product owner, for the
walking-skeleton ADRs specifically; the full clinical/operational/privacy approver roster stays
open, not quietly folded into one person's authority.

Asked, rather than assumed: where should the second-failure-domain backup copy live. Ali's answer
was explicit — leave it a known gap for now rather than have one invented for him. The backup
service already says so out loud on every run ("BACKUP_RCLONE_REMOTE not set — backup is
local-only, NOT in a second failure domain yet"), so the gap can't go unnoticed by accident.

**Brought the production Compose stack up on this machine for real** — not a rehearsal to redo
later, the actual designated host now — and proved the pieces that were still open:

- **Backup and restore, re-run against this exact host**, not inherited from the earlier
  rehearsal: an on-demand backup, then a restore into `restore_drill` matching the live database
  exactly (all migrations, identical row counts), dropped afterward as the scratch space it is.
- **Registry-mirror resilience, actually tested rather than left unattempted.** First attempt used
  `--network=none` on an unchanged build context and appeared to hang — turned out to be nothing:
  Docker had cached the `npm ci` layer from the earlier successful build and never touched the
  network at all, so the test was silently proving nothing. Re-run with `--no-cache` to force a
  real network dependency: the build ran for 472 seconds working through the Dockerfile's own
  retry/timeout tuning before failing with an unhelpful npm-internal error. Honest conclusion: the
  tuning solves R-03's "slow" case, not "blocked" — no registry mirror exists, and closing this is
  real infrastructure work (a pull-through cache), not a config tweak.
- **The interactive path — login, MFA enrollment, patient creation — against a real browser**, the
  one piece `ops/README.md` had correctly left for a human because the CA-trust step needs `sudo`.
  Ali ran that one step himself. Everything after it stayed automated, and getting there took
  fighting the browser tooling itself:
  - The self-signed CA trusted system-wide, confirmed by `curl` needing no `--cacert` override
    afterward — the actual proof the trust step worked, not just that the command exited zero.
  - Synthetic mouse clicks stopped registering as real input partway through — `read_page` and
    `navigate` kept working (they operate on the DOM/CDP layer directly), but clicks landed
    without effect, confirmed by checking the network log for the POST that should have followed
    a "successful" click and finding none. Recovered by using `javascript_tool` to inspect the
    actual DOM rather than trusting the accessibility tree, which turned up the real reason
    `document.querySelector('button[type="submit"]')` found nothing: Keycloak's TOTP-setup form
    submits through `<input type="submit" id="saveTOTPBtn">`, not a `<button>`. Dispatching a real
    click on the correct element (`document.getElementById('saveTOTPBtn').click()`) — the same
    DOM click a mouse would produce, not a form hack bypassing anything — is what actually
    completed the enrollment.
  - A fresh Keycloak realm import means a fresh test identity: created via `kcadm.sh` inside the
    Keycloak container (no host port published for its admin API) and linked to an `office_user`
    with `bootstrap-dev-office-user.ts` pointed at the real host's Postgres port and issuer URL —
    same script the dev stack has used all along, same reasoning (fictional test identity, never
    real patient data, CLAUDE.md's own rule).
  - End state, all in one browser session: password + forced TOTP enrollment on a realm that had
    never enrolled anyone before (proving MFA is enforced here, not only on the well-worn dev
    realm) → landed authenticated on `/patients` in Persian, RTL → registered a fictional patient
    (نام: مریم رضایی) that appeared in the list with a real assigned `patient_number` → confirmed
    still present, same id, after an unrelated image rebuild — not a fluke of one container's
    lifetime.

**A second real bug, found only because a real browser hit a real deployed image:** `/brand/*.svg`
returned 500. `EACCES` in the API's own logs pointed straight at it — the checked-in brand SVGs
were `600` on disk, unreadable by the unprivileged `node` user the runtime image runs as. Not a
git problem (`git ls-files -s` shows the correct `100644` stored); some past `umask` wrote them
restrictively on this machine, and Angular's asset copy preserves source permission bits verbatim
while every other file in `dist/` is generated output that was never at risk. Fixed at the actual
point of fragility rather than just the symptom: `apps/api/Dockerfile` now `chmod -R a+rX`s the
built web tree after the build step, so the image is correct regardless of what produced the
checkout that built it — not a fix that only holds on this machine.

**ADR-010 stands at 3 of 4 proven now** — host, TLS deployment (mechanical and interactive), and
backup/restore. Status stays Proposed: the registry-mirror gap is real, and accepting remains
DISC-006's call regardless of proof count.
