import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OFFICE_REPOSITORY } from "./domain/repositories/office.repository";
import { OfficeOrmEntity } from "./infrastructure/persistence/office.orm-entity";
import { TypeOrmOfficeRepository } from "./infrastructure/persistence/office.typeorm-repository";

/**
 * Deliberately seed/ops-only, not incomplete wiring — worth stating plainly,
 * because "nothing injects OFFICE_REPOSITORY" reads exactly like a dangling
 * half-built feature otherwise. Dentix is single-office by design (CLAUDE.md:
 * multi-location billing is explicitly excluded from v1), so there is no
 * user-facing "create an office" flow to build and never will be one for this
 * product: the one office row is provisioned once, at deployment/bootstrap
 * time, by a script that calls `OfficeRepository.create()` directly
 * (`scripts/bootstrap-dev-office-user.ts` today; its production equivalent
 * belongs to the ADR-010 deployment runbook) rather than through this
 * module's own Nest DI wiring. This module still exists, registered here and
 * imported into AppModule, so the `office` table is a real migration-managed
 * entity (ADR-006's S2 proof) and participates in `lint:arch`'s entity-
 * registration check — not because a use case is expected to inject
 * OFFICE_REPOSITORY. If that ever changes (a real onboarding flow, multiple
 * offices), it changes here deliberately, not by someone assuming this was
 * always meant to be wired further and filling in the "missing" piece.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OfficeOrmEntity])],
  providers: [{ provide: OFFICE_REPOSITORY, useClass: TypeOrmOfficeRepository }],
  exports: [OFFICE_REPOSITORY],
})
export class OfficeAdministrationModule {}
