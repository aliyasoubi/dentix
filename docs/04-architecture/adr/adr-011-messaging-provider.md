# ADR-011: SMS/Email Messaging Provider

- **Status:** Proposed — accept via the acceptance checklist below; sender-line registration must start earlier per risk R-08
- **Constraint:** Communications owns message intent/state; Integrations owns the vendor adapter (`07-context-module-map.md`). The provider is replaceable behind one port.

## Recommended decision

1. **SMS:** one domestic Iranian SMS provider as primary — evaluate **Kavenegar, SMS.ir, and Melipayamak** (all offer REST APIs and Node SDKs) on: delivery reporting via callback, dedicated sender line availability, template pre-registration requirements, pricing, and uptime history. Record the chosen provider and a named **fallback provider** here on acceptance.
2. **Email:** self-hosted SMTP relay or a domestic transactional email service; email is secondary to SMS for this office and must not block R2.
3. **Adapter rules:** the Integrations adapter implements one `MessageDeliveryPort`; provider callbacks are verified (shared-secret or signature) before they can advance `communication_status_event`; provider outage degrades to the manual contact queue, never to silent drops.
4. Delivery attempts, retries, and idempotency follow `08-transaction-event-semantics.md` — at-least-once with a per-intent attempt cap.

## Acceptance checklist

- [ ] Primary and fallback providers named; sender line and required templates registered.
- [ ] One appointment-reminder SMS delivered end-to-end (intent → queue → provider → callback → status event) against a test number.
- [ ] Callback verification rejects an unsigned/forged status callback in an integration test.
- [ ] Provider-down path lands the intent in the manual contact queue with an operational alert.
