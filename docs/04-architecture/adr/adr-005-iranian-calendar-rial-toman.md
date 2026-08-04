# ADR-005: Iranian Calendar and Rial/Toman Representation

  - Status: Accepted

  - Date: 2026-08-02

## Context

The first product is intended for a domestic Iranian dental office while retaining Persian and English operation. Date and money ambiguity would create scheduling, reporting, and patient-finance risk if treated as a late presentation concern.

## Decision

70. The default office timezone is the explicit IANA zone Asia/Tehran.

71. UTC instants and Gregorian ISO dates are canonical for storage, APIs, audit ordering, and interchange.

72. Jalali is a required first-class input, display, filtering, and print mode. Converting between Jalali and Gregorian must preserve the same domain date or instant.

73. Iranian official holidays and office closures are maintained as versioned configuration.

74. Iranian mobile numbers accept common domestic/international formats and retain original plus canonical normalized values.

75. National code is optional and policy-controlled; its absence must not block legitimate registration.

76. Patient addresses support Iranian province/city/postal-code structure plus free-form exceptions.

77. The canonical financial currency is Iranian rial (IRR), stored as integer rials.

78. Toman is an explicitly labeled input/display unit only. One toman equals ten rials exactly.

79. Every financial field, total, receipt, statement, report, and export identifies the displayed unit.

80. Conversion preserves exact value and never silently rounds merely to present whole tomans.

## Consequences

  - Angular date controls require a tested Jalali/Gregorian adapter and visible calendar mode.

  - Business logic and APIs remain independent of formatted Jalali strings.

  - Financial domain objects expose canonical rial amounts; localized formatting remains outside the domain.

  - Treatment-plan and receipt snapshots retain the canonical rial value and issued display unit.

  - Test suites require leap-year, month-boundary, timezone, holiday, digit-normalization, and rial/toman conversion coverage.

  - Future multi-currency support or a different canonical monetary unit requires a replacement ADR and data migration.
