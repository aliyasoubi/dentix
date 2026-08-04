# Documents and Communications Requirements

## Documents

Supported initial content:

  - PDF

  - JPEG and PNG

  - Scanned forms

  - Consent documents

  - Laboratory prescriptions and results

  - Referral documents

  - External imaging references

Each document records patient, optional encounter/journey/lab link, category, document date, upload time, uploader, original filename, MIME type, size, hash, storage key, language, and description.

## Storage and access

  - Binary content is stored in encrypted object storage.

  - Database rows store metadata and access control.

  - Download and preview are audited for sensitive categories according to policy.

  - Malware scanning is required before a file becomes available.

  - File names are not trusted as content types.

  - Signed documents are retained as immutable versions.

## Consent and acknowledgment

The system may generate consent or treatment acknowledgment from approved bilingual templates. It stores template version, generated content hash, patient/representative, method, timestamp, witness where required, and related plan or procedure.

## Communications

Included communications:

  - Appointment confirmation

  - Appointment reminder

  - Cancellation confirmation

  - Recall reminder

  - Follow-up reminder or manual patient contact

  - Lab-related patient update when staff choose to send it

Excluded:

  - Promotional marketing campaigns

  - Lead nurturing

  - Advertising attribution

  - Sales pipelines

## Delivery architecture

The application creates a communication record and enqueues delivery. Provider callbacks update delivery status. Retries follow a bounded policy and do not create duplicate messages.

## Message language

The patient’s preferred language selects the default approved template. Staff may choose another available version. Clinical free text is not automatically translated.

## Communication history

History includes channel, direction, template/version, sender, recipient destination masked in lists, queued/sent/delivered/failed state, external identifier, and related patient context.
