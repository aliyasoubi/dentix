# ADR-011: SMS and Email Provider Selection

- **Status:** Proposed — must be accepted during Release 2 planning
- **Gap identified in design review:** transactional reminders are in scope with queue/retry/callback architecture defined, but no Iranian-operable provider is chosen. Iranian SMS panels require sender-ID registration and template pre-approval lead time.

## Options to evaluate
Domestic SMS panels (e.g., Kavenegar, Melipayamak, SMS.ir — verify current status), plus a self-hosted or domestic SMTP path for email.

## Decision drivers
Delivery reliability to Iranian operators, webhook/callback support for delivery status, template approval process and lead time, pattern/OTP line requirements, cost per message, API stability.

## Decision
_To be recorded, including fallback behavior when delivery fails and the lead-time plan for sender registration._
