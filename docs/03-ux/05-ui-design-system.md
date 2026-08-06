---
title: Dentix UI Design System
document_id: UX-DS-001
version: 0.4.1
status: Accepted for implementation
owner: Frontend Engineering
target_path: docs/03-ux/05-ui-design-system.md
applies_to:
  - Angular 22
  - Angular Material/CDK
  - "v1: Farsi-only UI, RTL-only, Jalali-only presentation (ADR-012)"
  - "Locale-neutral boundaries retained for future replacement ADRs"
  - Desktop-first dental PMS
---

# Dentix UI Design System

## 1. Purpose

This document defines the implementation-ready UI/UX design system for Dentix.

The design direction adopts the following principles:

- Workflow simplicity and patient-centered navigation
- Angular Material/CDK for behavior, accessibility, forms, overlays, focus, drag-and-drop, and bidirectionality
- A custom visual system rather than default Angular Material styling
- Farsi-first (fa-IR, RTL) at the component and layout level; architecture ready for additional locales (ADR-012)
- Compact clinical and operational screens without visual clutter
- Restrained, purposeful motion
- A code-first prototype process using Storybook instead of Figma

This document defines the product's interaction and visual rules.

---

## 2. Design Decision

The approved frontend UI foundation is:

```text
Angular 22
├── Angular Material
├── Angular CDK
├── Custom design tokens
├── Custom product components
├── Custom dental components
├── Storybook
├── Externalized Farsi resources (fa-IR only in v1; ADR-012)
└── RTL-first layout with CSS logical properties
```

Do not mix Angular Material with PrimeNG, NG-ZORRO, or another full UI component suite.

Angular Material is infrastructure, not the final visual identity.

---

## 2.1 Locale, Direction, and Money

### Decision summary

The v1 locale, direction, and calendar are fixed product decisions. The office may configure the default money display/input unit.

Approved defaults:

```yaml
localization:
  locale: fa-IR
  direction: rtl
  calendar: JALALI

money:
  defaultUnit: TOMAN
  showUnitLabel: true
```

The application must not place a persistent Persian/English switch button in the main toolbar.

The v1 application locale is fixed to `fa-IR`. An authorized administrator selects the default money unit. Public bootstrap configuration is loaded before the main application renders; money-unit changes take effect after reload or a new session.

The fixed locale keeps the v1 interface and test matrix predictable. Locale-neutral code boundaries are retained for a future replacement ADR.

### RTL-first design

Persian is the primary design direction.

The interface must be designed and tested RTL-first rather than created in LTR and mirrored at the end.

Application startup must set:

```html
<html lang="fa-IR" dir="rtl">
```

Direction is derived from the fixed locale and must not be maintained as an unrelated user setting.

RTL affects:

- Application navigation
- Page headers
- Side-panel entry side
- Form alignment
- Table action placement
- Menus and overlays
- Directional icons
- Keyboard navigation expectations
- CSS logical spacing

RTL must not reverse:

- Dental anatomy
- Tooth numbering semantics
- Chronological time progression
- Numeric values
- Phone numbers
- Email addresses
- Technical codes
- Financial arithmetic

Use CSS logical properties:

```css
.component {
  margin-inline-start: var(--ds-space-4);
  padding-inline: var(--ds-space-3);
  border-inline-start: 3px solid var(--ds-action-primary);
  text-align: start;
}
```

Avoid feature-level hard-coded `left` and `right` unless the property describes real anatomy or another non-linguistic direction.

### Translation resource files

All static user-interface text must be loaded from translation resource files. Angular templates and TypeScript components must not hardcode user-facing Persian prose.

Recommended structure:

```text
public/i18n/fa-IR/
├── common.json
├── navigation.json
├── patients.json
├── scheduling.json
├── clinical.json
├── treatment.json
├── follow-up.json
├── laboratory.json
├── ledger.json
├── reports.json
├── administration.json
└── errors.json
```

Example:

```json
{
  "patient.search.placeholder": "جستجوی نام، شماره بیمار یا موبایل",
  "patient.actions.create": "ثبت بیمار جدید",
  "patient.alerts.critical": "هشدار پزشکی مهم"
}
```

Translation keys must be:

- Stable
- Semantic
- Feature-scoped
- Independent from the displayed sentence
- Checked for missing values during CI
- Free from clinical or financial business logic

Do not build sentences by concatenating translated fragments.

Use parameterized messages:

```json
{
  "appointment.conflict": "این بازه با نوبت {{patientName}} تداخل دارد."
}
```

### Language boundaries

The implementation must distinguish:

1. **Application interface language:** fixed to `fa-IR` and loaded from product translation resources.
2. **Patient communication language:** stored per patient for future use; v1 always selects approved Persian templates.
3. **User-entered clinical language:** stored exactly as entered and never automatically translated.

All patient documents ship Persian-only. The per-patient communication-language field is retained for a future replacement ADR but has no v1 template-selection effect.

### Static text versus configurable dental content

Static interface text belongs in translation resource files.

Examples:

- Save
- Cancel appointment
- Patient search
- Current balance
- Follow-up overdue

Configurable business content belongs in database translation records.

Examples:

- Procedure names
- Appointment-type names
- Treatment-stage names
- Consent-template content
- Clinical note templates
- Lab work types

Recommended data model:

```text
procedure_catalog
├── id
├── stable_code
├── duration
├── fee
└── active

procedure_catalog_translation
├── procedure_id
├── locale
├── name
└── description
```

This prevents application deployment from being required when the office changes a procedure label.

### Application bootstrap behavior

The frontend must load public, non-secret application configuration before rendering authenticated application routes.

Conceptual startup sequence:

```text
Load application configuration
        ↓
Validate fixed v1 locale (`fa-IR`)
        ↓
Load common translation resources
        ↓
Set document lang and dir
        ↓
Initialize date and number formatters
        ↓
Initialize money display policy
        ↓
Render application shell
        ↓
Lazy-load feature translations as routes open
```

If the `fa-IR` resource cannot be loaded:

1. Record a technical error without patient information.
2. Retry loading the fa-IR resource; if a single namespace fails, render stable keys in a clearly broken style rather than silent English text.
3. Show a visible administrative warning.
4. Do not render untranslated keys as normal production text.
5. CI missing-key validation is the primary defense; runtime fallback is a last resort, not a feature.

Example configuration:

```json
{
  "localization": {
    "locale": "fa-IR",
    "direction": "rtl",
    "calendar": "JALALI"
  },
  "money": {
    "defaultUnit": "TOMAN",
    "showUnitLabel": true
  }
}
```

The public frontend configuration must contain no secrets.

### Money decision: distinguish storage from entry and display

The office may choose **rial** or **toman** as its default working unit.

However, the database must use one canonical representation so changing configuration cannot reinterpret historical amounts.

Approved rule:

> Store money canonically as integer Iranian rials. Use the configured default unit for data entry, display, reports, and printed documents.

```text
Canonical storage: IRR rial
Configured default unit: RIAL or TOMAN
Conversion: 1 toman = 10 rials
```

Examples:

```text
User enters:       2,500,000 toman
Canonical storage: 25,000,000 rial
Displayed:         2,500,000 تومان
```

If configured for rial:

```text
User enters:       25,000,000 rial
Canonical storage: 25,000,000 rial
Displayed:         25,000,000 ریال
```

Changing the configuration from toman to rial changes only entry and presentation. It must never multiply or divide stored historical values.

### Money configuration requirements

Supported values:

```typescript
type MoneyDisplayUnit = 'RIAL' | 'TOMAN';
```

Configuration:

```typescript
interface MoneyConfiguration {
  defaultUnit: MoneyDisplayUnit;
  showUnitLabel: true;
}
```

The unit label is mandatory on:

- Procedure fees
- Treatment plans
- Patient balances
- Payments
- Refunds
- Receipts
- Statements
- Financial reports
- Exported financial files
- Confirmation dialogs
- Printed documents

Do not display an unlabeled amount in a financial workflow.

### Conversion rules

Use integer arithmetic.

```typescript
const RIALS_PER_TOMAN = 10;

function toCanonicalRials(
  amount: bigint,
  unit: MoneyDisplayUnit,
): bigint {
  return unit === 'TOMAN'
    ? amount * BigInt(RIALS_PER_TOMAN)
    : amount;
}

function fromCanonicalRials(
  amountInRials: bigint,
  unit: MoneyDisplayUnit,
): bigint {
  if (unit === 'RIAL') {
    return amountInRials;
  }

  if (amountInRials % BigInt(RIALS_PER_TOMAN) !== BigInt(0)) {
    // ENTRY paths: reject with a validation message.
    // DISPLAY paths: never throw — fall back to an explicitly
    // labeled rial rendering.
    throw new Error('AMOUNT_NOT_REPRESENTABLE_AS_WHOLE_TOMAN');
  }

  return amountInRials / BigInt(RIALS_PER_TOMAN);
}

// Display-safe variant used by DsMoneyDisplayComponent:
function formatMoney(amountInRials: bigint, unit: MoneyDisplayUnit): FormattedMoney {
  if (unit === 'TOMAN' && amountInRials % BigInt(RIALS_PER_TOMAN) !== BigInt(0)) {
    return { value: amountInRials, unit: 'RIAL' }; // explicit rial fallback, labeled
  }
  return { value: fromCanonicalRials(amountInRials, unit), unit };
}
```

> The API exchanges `amountRial` as a decimal string. The generated client converts it to
> `bigint`; financial values are never parsed to JavaScript `number` for arithmetic.

Do not use JavaScript floating-point numbers for financial calculations.

If a rial amount is not exactly representable as a whole toman, the system must follow an explicit office policy rather than silently rounding. For the initial product, posting such a value through a toman-only form should be rejected with a clear validation message.

### Money input component

Create one shared component:

```text
DsMoneyInputComponent
```

It must:

- Display the configured unit beside the field
- Accept Persian and Latin digits
- Normalize grouping separators
- Reject ambiguous decimal input
- Convert to canonical rials before sending commands
- Display the canonical interpretation before high-risk posting
- Support large integer values
- Use tabular numerals
- Never allow a user to remove or hide the unit label

Example:

```text
مبلغ
[ ۲٬۵۰۰٬۰۰۰              ] تومان

معادل ثبت‌شده: ۲۵٬۰۰۰٬۰۰۰ ریال
```

The equivalent canonical value may be shown on payment, refund, reversal, and fee-configuration screens where it reduces ambiguity. It need not appear beside every ordinary read-only amount.

### Configuration permissions and audit

Only an authorized administrator may change:

- Default money unit

A change must record:

- Previous value
- New value
- User
- Timestamp
- Reason when required

Changing the money display unit must produce a configuration audit event.

The system should warn that changing the money unit affects display and entry conventions but not stored values.

### Acceptance criteria

Language and direction:

- With `fa-IR`, the first authenticated screen renders RTL with Persian text.
- No top-toolbar language switch is present.
- Missing translation keys fail CI.
- Missing production translation files trigger fallback and an administrative warning.
- Dental anatomy and chronological time are not mirrored in RTL.
- Patient communication language remains independent from application language.

Money:

- With `defaultUnit = TOMAN`, entering `2,500,000` stores `25,000,000` canonical rials.
- With `defaultUnit = RIAL`, entering `25,000,000` stores `25,000,000` canonical rials.
- Changing the configured unit does not modify existing ledger entries.
- Every financial input, summary, report, and document displays a unit label.
- Persian and Latin digit input produce the same canonical value.
- Floating-point arithmetic is not used.
- Non-divisible rial values are never silently rounded when displayed or entered as whole toman.

### Testing requirements

Add tests for:

- Persian default startup
- Correct document `lang` and `dir`
- Feature translation lazy loading
- Missing-file fallback
- Missing-key CI validation
- Persian/Latin digit normalization
- RTL overlays and side panels
- Dental anatomy in RTL
- Rial input and storage
- Toman input and rial conversion
- Unit configuration change with historical data
- Very large values
- Non-divisible rial-to-toman cases
- Receipts and reports in configured units
- Patient communication language does not change the v1 Farsi template

---

## 3. Product Design Personality

The interface must feel:

- Calm
- Precise
- Clean
- Fast
- Trustworthy
- Modern
- Compact without feeling crowded
- Friendly without appearing playful
- Professional without feeling outdated

The interface must not resemble:

- A generic administration dashboard
- A collection of unrelated cards
- A default Angular Material demo
- A highly decorative consumer application
- A legacy desktop application copied into a browser
- A hospital information system overloaded with technical terminology

---

## 4. Core UX Principles

### 4.1 Keep patient context visible

When a patient is open, a persistent patient header must remain visible across:

- Appointments
- Clinical chart
- Periodontal chart
- Treatment plans
- Treatment journeys
- Lab work
- Documents
- Ledger
- Communications

The header should contain only high-value information:

- Patient name
- Patient number
- Age or date of birth
- Critical medical alert
- Current appointment
- Active treatment journey
- Current balance when permitted

### 4.2 Always show the next action

Every operational workflow should answer:

1. What has happened?
2. What is the current status?
3. What should happen next?
4. Who is responsible?
5. Is anything blocking progress?

### 4.3 Minimize data re-entry

Data should flow through the product:

```text
Treatment plan
    ↓
Planned appointment
    ↓
Scheduled appointment
    ↓
Encounter
    ↓
Completed procedure
    ↓
Patient ledger
```

The user should not repeatedly select the same:

- Patient
- Tooth
- Surface
- Procedure
- Provider
- Fee
- Journey
- Lab order

### 4.4 Prefer contextual panels

Use a right-side contextual panel for short tasks:

- View or edit appointment details
- Quick patient demographic edit
- Complete a follow-up task
- Update a lab order
- Record a simple payment
- Select a procedure
- Review journey details

Use a dedicated page for complex work:

- Clinical charting
- Periodontal charting
- Full treatment planning
- Detailed patient statements
- Complex administration

### 4.5 Make high-risk actions explicit

The following actions must never look like ordinary save operations:

- Sign clinical note
- Amend signed note
- Enter a record in error
- Post payment
- Reverse payment
- Refund payment
- Merge patients
- Close the financial day
- Export patient records

### 4.6 Optimize for workflow speed

Visual polish must never make the workflow slower.

Prefer:

- Clear hierarchy
- Fewer modal dialogs
- Keyboard support
- Persistent context
- Progressive disclosure
- Explicit status
- Minimal re-entry
- Predictable action placement

Avoid:

- Decorative animations
- Large empty cards
- Hidden row actions
- Repeated page navigation
- Full-page transitions
- Unnecessary confirmations for low-risk actions

---

## 5. Prototype and Documentation Strategy

Figma is not required.

Use Storybook as the executable component prototype and design documentation system.

Workflow:

```text
Design rule
   ↓
Design token
   ↓
Angular component
   ↓
Storybook stories
   ↓
Interaction test
   ↓
Accessibility test
   ↓
Visual regression
   ↓
Product usage
```

Required Storybook stories should include at least:

```text
PatientHeader
├── Default Farsi/RTL
├── Critical alert
├── Active implant journey
├── Restricted balance
├── Long patient name
└── Missing photograph

AppointmentCard
├── Scheduled
├── Confirmed
├── Arrived
├── Completed
├── Cancelled
├── No-show
├── Lab not ready
├── Conflict
└── Persian

MoneyDisplay
├── Rial
├── Toman
├── Positive
├── Negative
├── Zero
└── Large amount

StatusChip
├── Planned
├── Active
├── Pending
├── Completed
├── Cancelled
├── Overdue
└── Error
```

---

## 6. Color System

### 6.1 Brand palette

Use a restrained teal-blue clinical palette.

```css
:root {
  --ds-brand-50:  #eef9fa;
  --ds-brand-100: #d6f0f3;
  --ds-brand-200: #afe1e7;
  --ds-brand-300: #7dcbd5;
  --ds-brand-400: #48afbe;
  --ds-brand-500: #268f9f;
  --ds-brand-600: #187381;
  --ds-brand-700: #155c68;
  --ds-brand-800: #154b55;
  --ds-brand-900: #153f47;

  --ds-action-primary:       var(--ds-brand-600);
  --ds-action-primary-hover: var(--ds-brand-700);
  --ds-action-primary-soft:  var(--ds-brand-50);
  --ds-focus-ring:           var(--ds-brand-400);
}
```

### 6.2 Neutral surfaces

```css
:root {
  --ds-page:            #f5f8fa;
  --ds-surface:         #ffffff;
  --ds-surface-subtle:  #f8fafb;
  --ds-surface-raised:  #ffffff;
  --ds-border:          #dce5e9;
  --ds-border-strong:   #bccbd2;

  --ds-text-primary:    #172b34;
  --ds-text-secondary:  #50656f;
  --ds-text-muted:      #71848d;
  --ds-text-disabled:   #9aa8ae;
}
```

### 6.3 Semantic colors

```css
:root {
  --ds-success:       #237a49;
  --ds-success-soft:  #e9f6ee;

  --ds-warning:       #946200;
  --ds-warning-soft:  #fff4d6;

  --ds-danger:        #b42318;
  --ds-danger-soft:   #fff0ee;

  --ds-info:          #1769a5;
  --ds-info-soft:     #eaf4fc;

  --ds-neutral-state: #667780;
  --ds-neutral-soft:  #eef2f4;
}
```

### 6.4 Color rules

- Brand color is reserved for primary actions and selected states.
- Green represents completed or safe states.
- Amber represents waiting, pending, or attention-required states.
- Red represents danger, overdue, conflict, failure, or critical clinical alerts.
- Blue represents information or active progress.
- Grey represents neutral, cancelled, inactive, draft, or historical states.
- No meaning may depend on color alone.
- Every state must include readable text and optionally an icon.
- Do not assign strong background colors to entire modules.
- Appointment cards should remain mostly neutral.

---

## 7. Typography

### 7.1 Font families

```css
:root {
  --ds-font-fa: "Vazirmatn", "Tahoma", sans-serif;
  --ds-font-en: "Inter", "Segoe UI", sans-serif;
}

/* attribute value is fa-IR, so match on prefix (or use :lang(fa)) */
html[lang^="fa"] {
  font-family: var(--ds-font-fa);
}

html[lang^="en"] {
  font-family: var(--ds-font-en);
}
```

The fonts must be deployed through the application’s approved asset and licensing process.

### 7.2 Type scale

| Role | Font size / line height | Weight |
|---|---:|---:|
| Page title | 24 / 32 px | 650 |
| Major section | 20 / 28 px | 650 |
| Section title | 16 / 24 px | 600 |
| Body | 14 / 22 px | 400 |
| Dense body | 13 / 20 px | 400 |
| Form label | 13 / 18 px | 550 |
| Supporting text | 12 / 18 px | 400 |
| Button | 14 / 20 px | 600 |
| Large financial amount | 24 / 32 px | 650 |

### 7.3 Typography rules

- Use no more than three font weights on one screen.
- Use tabular numerals for money, appointment times, tooth numbers, periodontal values, and reports.
- Technical identifiers, codes, email addresses, phone numbers, and URLs remain LTR.
- Avoid centered body text.
- Farsi body text uses the defined line-height tokens and must not clip diacritics.
- Do not automatically transliterate names.

---

## 8. Spacing and Density

### 8.1 Spacing scale

```css
:root {
  --ds-space-1: 4px;
  --ds-space-2: 8px;
  --ds-space-3: 12px;
  --ds-space-4: 16px;
  --ds-space-5: 20px;
  --ds-space-6: 24px;
  --ds-space-8: 32px;
  --ds-space-10: 40px;
  --ds-space-12: 48px;
}
```

### 8.2 Standard dimensions

| Element | Size |
|---|---:|
| Main toolbar | 56 px |
| Expanded navigation | 240 px |
| Collapsed navigation | 64 px |
| Standard button | 40 px |
| Compact button | 34–36 px |
| Standard field | 44 px |
| Compact grid field | 36–40 px |
| Standard table row | 44–48 px |
| Compact clinical row | 36–40 px |
| Patient header | 72–88 px |
| Side panel | 380–440 px |
| Dialog maximum width | 640–720 px |
| Desktop page padding | 24 px |
| Tablet page padding | 16 px |

### 8.3 Density modes

Use two density modes.

**Comfortable**

- Patient registration
- Demographic forms
- Treatment planning
- Administration
- Confirmation dialogs

**Compact**

- Schedule
- Follow-up Center
- Ledger
- Clinical timeline
- Periodontal chart
- Reports

Do not apply maximum compact density to the entire application.

---

## 9. Shape, Border, and Elevation

### 9.1 Radius

```css
:root {
  --ds-radius-sm: 6px;
  --ds-radius-md: 10px;
  --ds-radius-lg: 14px;
  --ds-radius-pill: 999px;
}
```

Use:

- `6px` for fields and compact controls
- `10px` for ordinary cards and panels
- `14px` for large empty states and major content surfaces
- Pill radius only for chips and filter controls

### 9.2 Elevation

```css
:root {
  --ds-shadow-panel:
    0 12px 32px rgb(27 55 68 / 12%),
    0 2px 8px rgb(27 55 68 / 8%);

  --ds-shadow-menu:
    0 8px 24px rgb(27 55 68 / 16%);
}
```

Use borders for ordinary containers.

Use shadows only for menus, dialogs, side panels, drag previews, and floating actions.

Do not wrap every section in a raised card.

---

## 10. Application Shell

### 10.1 Primary navigation

```text
Dashboard
Patients
Schedule
Follow-up
Payments
Reports
Administration
```

Clinical work must be entered through patient context rather than a global Clinical menu.

### 10.2 Shell layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Global patient search          Date (Jalali)  User menu     │
├────────────┬────────────────────────────────────────────────┤
│ Dashboard  │ Page title                    Primary action   │
│ Patients   ├────────────────────────────────────────────────┤
│ Schedule   │                                                │
│ Follow-up  │                Page content                    │
│ Payments   │                                                │
│ Reports    │                                                │
│ Admin      │                                                │
└────────────┴────────────────────────────────────────────────┘
```

### 10.3 Shell rules

- Global patient search remains visible.
- Main page action is positioned near the page title.
- Navigation contains no more than seven primary destinations.
- Sidebar supports expanded and collapsed states.
- The application shell does not expose an everyday language-switch button.
- The shell validates and applies fixed `fa-IR`/RTL bootstrap values before rendering.
- The shell uses quiet neutral surfaces.
- Avoid simultaneous global search, page search, and patient search controls unless clearly separated by context.

---

## 11. Page Header Pattern

Every major page should follow:

```text
Page title
Short contextual description                   Primary action
Filter/search controls                         Secondary menu
───────────────────────────────────────────────────────────────
Page content
```

Rules:

- One primary filled button per primary visual region.
- Secondary actions use outlined, tonal, text, or menu styles.
- Filters appear below the title, not inside unrelated cards.
- The title must describe the user’s task, not the internal module name.

---

## 12. Patient Header Component

The patient header is a critical product component.

```text
┌─────────────────────────────────────────────────────────────┐
│ [Photo] Sara Ahmadi  #10428       ⚠ Penicillin allergy     │
│         35 years · فارسی           Implant · Healing        │
│         Today 10:30                 18,500,000 تومان         │
└─────────────────────────────────────────────────────────────┘
```

Behavior:

- Sticky below the application toolbar.
- Critical alerts remain visible.
- Secondary values collapse on narrower widths.
- Balance follows permission rules.
- Active journey is clickable.
- The whole header must not use a strong status background.
- Critical alerts may use a dedicated high-severity strip.

---

## 13. Status Chip Component

Create one shared component:

```text
DsStatusChipComponent
```

Dimensions:

- Height: 24–26 px
- Horizontal padding: 8 px
- Icon: 14–16 px
- Text: 12–13 px

State mapping:

| State family | Visual role |
|---|---|
| Draft / planned | Neutral |
| Scheduled / active | Information |
| Pending / waiting | Warning |
| Completed / ready | Success |
| Cancelled / skipped | Neutral subdued |
| Overdue / conflict / error | Danger |

Every chip must include readable text.

---

## 14. Buttons and Actions

### Primary action

Examples: Save appointment, Create treatment plan, Record payment, Sign encounter.

### Secondary action

Examples: Save draft, Print, Reschedule, Add note.

### Tertiary action

Examples: Close, View history, Clear filters.

### Danger action

Examples: Reverse payment, Merge patient, Enter note in error, Refund payment.

Rules:

- Icon-only buttons require a tooltip and accessible name.
- Domain-specific actions should normally include text.
- Ordinary navigation Cancel must not use danger styling.
- Use precise labels such as `Cancel appointment`, not `Cancel`.
- Do not use ambiguous labels such as `OK`.

---

## 15. Forms

Rules:

- Labels remain visible.
- Placeholder text is an example, not a label.
- Required state is explicit.
- Validation appears after blur or submit.
- Long forms use sections with headings.
- Avoid deeply nested accordions.
- Save Draft and Finalize must look different.
- Autosave applies only to drafts.
- Show subtle save status such as `Saved 14:32`.
- Warn before leaving with unsaved data.
- Use one column for long notes.
- Use two columns only for short, related fields.
- RTL changes visual placement but not workflow order or meaning.

---

## 16. Scheduler

### 16.1 Appointment card

```text
09:00–09:45
Sara Ahmadi
Implant review
Dr. Noorbakhsh
✓ Confirmed     Lab: Ready
```

Rules:

- Patient name has the strongest emphasis.
- Appointment time is consistently positioned.
- Reason is secondary.
- Provider is subtle.
- Show no more than two status indicators.
- Use a thin accent border for provider or appointment type.
- Keep the card background neutral.
- Medical alerts, conflicts, or lab risk may override the accent.

### 16.2 Appointment interaction

Click opens a contextual side panel containing:

- Patient summary
- Appointment status
- Confirmation
- Planned procedures
- Patient alerts
- Lab readiness
- Reschedule
- Cancel/no-show
- Open patient record

### 16.3 Drag behavior

- Show a lightweight placeholder.
- Highlight a valid target.
- Explain an invalid target immediately.
- Server validation remains authoritative.
- Restore the previous position after conflict.
- Provide keyboard and menu alternatives for all drag actions.

---

## 17. Patient Workspace

Sections:

```text
Overview
Appointments
Clinical
Periodontal
Treatment Plans
Journeys & Lab
Documents
Ledger
Communications
```

Rules:

- Persistent patient header remains visible.
- Switching sections preserves patient context.
- Drafts must not be discarded silently.
- Short actions open in side panels.
- Complex work uses dedicated pages.
- Permissions may hide or disable sections.
- Avoid showing all patient information on Overview.

---

## 18. Clinical Workspace

Recommended layout:

```text
┌──────────────┬──────────────────────────┬──────────────────┐
│ Clinical     │                          │ Selected tooth   │
│ tools        │       Odontogram         │                  │
│              │                          │ Findings         │
│ Findings     │                          │ Procedures       │
│ Procedures   │                          │ History          │
│ Templates    │                          │ Plan actions     │
└──────────────┴──────────────────────────┴──────────────────┘
```

Interaction flow:

1. Select tooth or surface.
2. Update the context panel.
3. Select a finding or procedure.
4. Enter structured details.
5. Add to chart or treatment plan.
6. Remain in the same workspace.

Rules:

- Do not use a modal for every tooth operation.
- Dental anatomy must not mirror in RTL mode.
- Selection must use outline, text, and accessible state—not color only.
- Existing, proposed, accepted, and completed states require distinct visual treatment.
- Provide a textual summary for accessibility and verification.

---

## 19. Treatment Planning

Use structured rows or tables rather than individual cards for every procedure.

```text
Phase 1 — Urgent

Procedure                 Tooth     Fee          Status
Root canal treatment       14       8,000,000    Accepted
Core build-up               14       2,500,000    Proposed
Crown                       14       9,000,000    Proposed
```

Persistent summary:

```text
Subtotal       19,500,000 تومان
Discount        1,500,000 تومان
Patient total  18,000,000 تومان
```

Flow:

```text
Chart finding
   ↓
Add proposed procedure
   ↓
Organize into phase
   ↓
Present plan
   ↓
Record acceptance
   ↓
Create planned appointment
   ↓
Schedule without re-entry
```

Rules:

- Clinical rationale and financial values remain visually distinct.
- Presented plan versions must remain reproducible.
- Accepted items can create planned or scheduled appointments.
- No insurance fields exist in the approved scope.

---

## 20. Treatment Journeys and Lab Work

Treatment journeys use a shared stage tracker.

Examples:

- Implant
- Orthodontic
- Prosthetic
- Custom long-running treatment

The journey view must show:

- Current stage
- Next action
- Due date
- Responsible user
- Future appointment
- Open tasks
- Related lab order
- Timeline

Lab readiness must be visible on:

- Journey view
- Appointment card
- Follow-up Center
- Patient workspace

Do not create separate unrelated mini-applications for each specialty.

---

## 21. Follow-up Center

Use an actionable dense list.

| Patient | Category | Stage | Next action | Due | Assigned |
|---|---|---|---|---|---|
| Sara Ahmadi | Implant | Healing | Schedule review | Today | Reception |
| Ali Karimi | Lab | Crown | Contact lab | Overdue | Assistant |
| Nika Moradi | Ortho | Active | Adjustment visit | 12 Aug | Reception |

Selecting a row opens a side panel.

Supported actions:

- Complete
- Reassign
- Change due date
- Add note
- Record patient contact
- Create appointment
- Skip with reason

Most follow-up work should be completed without leaving the queue.

---

## 22. Patient Ledger

Financial screens must be visually conservative.

```text
Current balance
۱۸٬۵۰۰٬۰۰۰ تومان

Date         Description          Charge        Payment       Balance
1405/05/12   Implant placement    25,000,000                  25,000,000
1405/05/12   Cash payment                       6,500,000      18,500,000
```

Rules:

- Rial or toman is always explicit.
- Financial values are right-aligned.
- Use tabular numerals.
- Posted transactions do not expose ordinary edit actions.
- Reversal requires a reason.
- Balance remains visible.
- Draft and posted charges are visually distinct.
- Refund, reversal, and day-close use high-risk confirmation dialogs.
- Do not animate financial totals.

---

## 23. Motion System

### 23.1 Motion purpose

Motion communicates state change, continuity, location, confirmation, error, and context.

Motion must not decorate dense clinical screens or delay task completion.

### 23.2 Motion tokens

```css
:root {
  --ds-motion-instant: 80ms;
  --ds-motion-fast: 120ms;
  --ds-motion-standard: 180ms;
  --ds-motion-panel: 220ms;
  --ds-motion-slow: 280ms;

  --ds-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ds-ease-enter: cubic-bezier(0, 0, 0, 1);
  --ds-ease-exit: cubic-bezier(0.3, 0, 1, 1);
}
```

### 23.3 Motion matrix

| Interaction | Duration |
|---|---:|
| Hover / press | 80–120 ms |
| Tooltip / menu | 120–160 ms |
| Status highlight | 120–180 ms |
| Row enter / remove | 160–200 ms |
| Side panel | 200–220 ms |
| Dialog | 180–220 ms |
| Snackbar | 180–220 ms |
| Appointment settle | 160–200 ms |
| Full route transition | None |

### 23.4 Side panel motion

```css
.ds-side-panel {
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity var(--ds-motion-panel) var(--ds-ease-enter),
    transform var(--ds-motion-panel) var(--ds-ease-enter);

  @starting-style {
    opacity: 0;
    transform: translateX(var(--ds-panel-enter-offset, 16px));
  }
}

html[dir="rtl"] {
  --ds-panel-enter-offset: -16px;
}

.ds-side-panel-leave {
  opacity: 0;
  transform: translateX(var(--ds-panel-enter-offset, 16px));
  transition:
    opacity var(--ds-motion-standard) var(--ds-ease-exit),
    transform var(--ds-motion-standard) var(--ds-ease-exit);
}
```

### 23.5 Task completion motion

```css
.ds-row-complete {
  animation: ds-complete var(--ds-motion-standard)
    var(--ds-ease-standard);
}

@keyframes ds-complete {
  0% {
    background: var(--ds-success-soft);
  }

  100% {
    background: transparent;
  }
}
```

### 23.6 Motion rules

Use motion for:

- Side-panel entry and exit
- Appointment dragging
- Follow-up completion
- Status change
- Validation feedback
- Loading skeletons
- Small expand/collapse interactions

Avoid motion for:

- Patient switching
- Clinical route transitions
- Financial total changes
- Every table update
- Tooth selection beyond a brief highlight
- Dashboard counters
- Repeated background refreshes

### 23.7 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }
}
```

Functional feedback must remain available without animation.

---

## 24. Angular Material Theme Structure

Use a single Angular Material theme and apply product-specific semantic tokens above it.

Illustrative structure:

```scss
@use '@angular/material' as mat;

@include mat.core();

$clinical-theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$cyan-palette,
    tertiary: mat.$azure-palette,
  ),
  typography: (
    brand-family: 'Vazirmatn, Inter, sans-serif',
    plain-family: 'Vazirmatn, Inter, sans-serif',
  ),
  density: (
    scale: -1,
  ),
));

html {
  @include mat.all-component-themes($clinical-theme);
}
```

Implementation rules:

- Pin the exact Angular Material version.
- Confirm theming syntax against the pinned version.
- Avoid deep overrides of internal Material selectors.
- Use supported component tokens and theme variables.
- Do not copy Material component source into the application.
- Feature modules must not define independent color systems.

---

## 25. Component Architecture

Recommended structure:

```text
libs/ui/
├── foundation/
│   ├── tokens
│   ├── typography
│   ├── icons
│   ├── motion
│   ├── direction
│   └── accessibility
│
├── product/
│   ├── app-shell
│   ├── page-header
│   ├── patient-header
│   ├── status-chip
│   ├── side-panel
│   ├── money-display
│   ├── timeline
│   ├── empty-state
│   └── data-table
│
└── dental/
    ├── scheduler
    ├── appointment-card
    ├── odontogram
    ├── perio-grid
    ├── treatment-plan-editor
    ├── journey-tracker
    ├── follow-up-queue
    ├── lab-order-card
    └── patient-ledger
```

Ownership rules:

- `foundation` contains no dental concepts.
- `product` contains reusable PMS interaction components.
- `dental` contains clinical domain components.
- Feature pages compose these components.
- Feature pages do not redefine global tokens.
- Components expose stable, typed APIs.
- Business rules remain in application/domain services, not visual components.

---

## 26. Implementation Sequence

### Stage 1 — Foundation

- Material theme
- Design tokens
- Typography
- Spacing
- Radius
- Elevation
- Motion
- RTL and mixed-script utilities
- Startup configuration loader
- Translation resource loader and missing-key checks
- Canonical rial money utilities
- Configured rial/toman input and display components
- Focus indicators
- Icons
- Storybook

### Stage 2 — Product components

- Application shell
- Page header
- Patient header
- Status chip
- Side panel
- Money display
- Timeline
- Empty state
- Data table
- Standard form patterns

### Stage 3 — First vertical slice

```text
Global patient search
→ Open patient
→ Create appointment
→ Confirm appointment
→ Check in
```

This slice establishes shell behavior, search behavior, patient context, forms, status, side panels, notifications, RTL, and motion.

### Stage 4 — Scheduler

- Time grid
- Appointment card
- Quick create
- Drag/reschedule
- Conflict handling
- Status transitions
- Lab readiness indicator

### Stage 5 — Patient workspace

- Persistent header
- Patient section navigation
- Overview
- Appointment history
- Clinical timeline
- Documents
- Balance summary

### Stage 6 — Clinical workflow

- Odontogram
- Selected tooth panel
- Findings
- Procedures
- Draft notes
- Treatment-plan handoff

### Stage 7 — Treatment continuity

- Treatment plan
- Journey tracker
- Follow-up Center
- Lab order and readiness
- Planned appointments

### Stage 8 — Patient finance

- Charges
- Payments
- Rial/toman presentation
- Reversal
- Receipt
- Day-end summary

---

## 27. UI Definition of Done

A UI feature is complete only when:

### Product behavior

- The workflow has explicit acceptance criteria.
- Primary and secondary actions are clear.
- High-risk actions are visually distinct.
- Patient context remains visible where required.
- Permissions are reflected correctly.

### Language and direction

- The fixed `fa-IR` resource and public bootstrap configuration load before the shell renders.
- Persian (fa-IR) works as the sole v1 configuration; RTL renders correctly.
- CSS logical properties are mandatory even though v1 is RTL-only.
- No everyday toolbar language switch is introduced.
- Mixed-script content works.
- Long Persian names do not break the layout.
- Persian and Latin digits are handled.
- Rial and toman labels remain visible.

### Interaction states

- Default state exists.
- Hover state exists where relevant.
- Focus state exists.
- Active/selected state exists.
- Disabled state exists.
- Loading state exists.
- Empty state exists.
- Validation state exists.
- Error state exists.
- Conflict state exists.
- Permission-denied state exists where relevant.

### Accessibility

- Keyboard operation works.
- Visible focus exists.
- Icon buttons have accessible names.
- Meaning does not depend on color.
- Screen-reader labels exist for custom dental controls.
- Reduced-motion preference is honored.
- Supported zoom levels remain usable.

### Engineering

- Design tokens are used.
- No unnecessary hard-coded color or spacing exists.
- Component API is typed.
- Storybook stories exist.
- Interaction tests exist for critical behavior.
- Visual regression coverage exists for custom components.
- The component does not contain authoritative dental or financial business rules.
- RTL visual tests pass.

---

## 28. First Components to Implement

Implement these components before building large feature pages:

1. `DsAppShellComponent`
2. `DsPageHeaderComponent`
3. `DsGlobalPatientSearchComponent`
4. `DsPatientHeaderComponent`
5. `DsStatusChipComponent`
6. `DsSidePanelComponent`
7. `DsMoneyDisplayComponent`
8. `DsAppointmentCardComponent`
9. `DsDataTableComponent`
10. `DsEmptyStateComponent`

Then complete the first production workflow:

```text
Search patient
→ Open patient
→ Create appointment
→ Confirm appointment
→ Check in
```

Do not begin with a decorative dashboard.

---

## 29. Summary Decision

The approved UI direction is:

> Workflow simplicity, Angular Material/CDK behavior, a restrained teal clinical design system, compact desktop density, persistent patient context, contextual side-panel interactions, a Farsi-only v1 locale, RTL-first design, canonical rial storage, configured rial/toman presentation, and restrained native CSS motion.

The system should be judged primarily by:

- Workflow completion time
- Error prevention
- Patient-context visibility
- Staff learnability
- Keyboard accessibility
- Clinical and financial clarity
- Consistency and completeness of the Persian experience
- Maintainability of shared components
