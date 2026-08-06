# Module Boundaries and Clean Code Rules

## Internal module layout

```
module/
  domain/
    entities/
    value-objects/
    services/
    events/
    repositories/
  application/
    commands/
    queries/
    use-cases/
    dto/
    ports/
  infrastructure/
    persistence/
    messaging/
    external/
    mappers/
  presentation/
    http/
    websocket/
```

## Dependency direction

  - Domain imports no NestJS, ORM, HTTP, Redis, or vendor SDK.
  - Application imports domain and defines ports.
  - Infrastructure implements ports.
  - Presentation converts transport input into application commands and queries.
  - Angular contains presentation and client orchestration, not authoritative dental or financial rules.
  - Allowed cross-module dependencies and data ownership are defined in `07-context-module-map.md`.

## Controller rules

Controllers perform authentication context extraction, validation, command/query dispatch, and response mapping. They do not implement transactions or domain rules.

## Use-case rules

A use case:

1. Loads required aggregates through repositories.
2. Performs authorization with object context.
3. Invokes domain behavior.
4. Commits authoritative writes for one owning module in one transaction.
5. Appends outbox/audit facts in that transaction.
6. Returns a transport-independent result.

## Persistence rules

ORM records are not exposed as domain entities or API responses. Explicit mappers protect the domain from persistence changes.

Cross-module behavior follows `08-transaction-event-semantics.md`. A use case never imports another module's repository.

## Shared kernel

Keep the shared kernel small: identifiers, money, date/time abstractions, result/error types, localization-safe codes, and audit actor. Dental concepts stay in their owning module.

## Code-quality rules

  - Strict TypeScript
  - No any except isolated audited adapters
  - Explicit nullability
  - Exhaustive state handling
  - Stable error codes
  - No business logic in templates
  - No direct database access outside repositories/migrations/report read models
  - Public module APIs documented and tested
  - Architecture boundary linting in CI
