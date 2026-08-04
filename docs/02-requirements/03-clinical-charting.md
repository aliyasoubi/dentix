# Clinical Charting Requirements

## Encounter

An encounter is created from an appointment or manually for an authorized clinical event. It includes provider, patient, office business date, start/end time, reason, history review, findings, diagnoses, notes, procedures, documents, and status.

States:

  - Draft

  - In review

  - Signed

  - Amended

  - Entered in error

## Clinical notes

  - Drafts MAY autosave.

  - Signing MUST be explicit and associated with an eligible provider.

  - Signed text MUST be immutable.

  - Amendment MUST retain original content, amendment content, author, timestamp, and reason.

  - Templates MAY provide structured fields and optional phrases but must not silently insert unreviewed clinical claims.

## Medical and dental history

History submissions are versioned. An encounter records which version the clinician reviewed. Changes after review create a new version rather than rewriting the prior history.

## Odontogram

The odontogram MUST support:

  - Permanent, primary, and mixed dentition

  - FDI/ISO and Universal display systems

  - Stable internal anatomical identifiers independent of numbering scheme

  - Tooth-level and surface-level findings and procedures

  - Existing, proposed, accepted, scheduled, in-progress, completed, referred, declined, and entered-in-error states

  - Missing, impacted, implant, pontic, crown, root canal, restoration, caries, fracture, mobility, and observation concepts

Implementation SHOULD use interactive SVG layers. Meaning MUST not depend on color alone.

## Periodontal chart

The system MUST support six sites per tooth and configurable charting order for probing depth, gingival margin/recession, bleeding, suppuration, plaque, mobility, furcation, missing tooth, and implant. Keyboard-first entry and comparison with previous exams are required.

## Procedure completion

Completing a procedure MUST:

35. Validate provider and tooth/surface requirements.

36. Link to encounter and any treatment-plan item.

37. Record completion date and author.

38. Optionally create a draft patient charge according to office configuration.

39. Update journey progress when applicable.

40. Never change a signed note silently.

## Clinical timeline

The timeline combines encounters, signed notes, amendments, findings, completed procedures, treatment-plan decisions, journey stage changes, lab events, and selected communications. It is chronologically stable and filterable.

## Safety requirements

  - No hard deletion of signed clinical data.

  - Concurrency conflicts are visible.

  - Patient identity remains visible during charting.

  - Switching patients with unsaved draft data requires explicit handling.

  - Tooth/surface mappings have unit and visual regression tests.
