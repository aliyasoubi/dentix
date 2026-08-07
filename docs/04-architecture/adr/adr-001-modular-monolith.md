# ADR-001: Start with a Modular Monolith

- **Status:** Accepted
- **Date:** 2026-08-02

## Context

The product serves one office and requires strong transactional consistency across scheduling, clinical, treatment, laboratory, and patient-finance workflows.

## Decision

Build one NestJS deployable application with explicit modules, one PostgreSQL database, a transactional outbox, and a separately scalable worker process where useful.

## Consequences

  - Simpler deployment, debugging, backup, and transaction handling
  - Lower operational cost
  - Module boundaries require architecture tests and review
  - Future extraction remains possible when a real scaling or isolation requirement exists

## Rejected

Microservices from the first release because distributed transactions and operational complexity provide no current user value.
