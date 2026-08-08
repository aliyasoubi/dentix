import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/public-api";
import { IdentityAccessModule } from "../identity-access/public-api";
import { TypeOrmUnitOfWork } from "../../platform/typeorm-unit-of-work";
import { UNIT_OF_WORK_PORT } from "../../platform/unit-of-work.port";
import { CreatePatientUseCase } from "./application/use-cases/create-patient.use-case";
import { SearchPatientsUseCase } from "./application/use-cases/search-patients.use-case";
import { PATIENT_CONTACT_REPOSITORY } from "./domain/repositories/patient-contact.repository";
import { PATIENT_NAME_REPOSITORY } from "./domain/repositories/patient-name.repository";
import { PATIENT_REPOSITORY } from "./domain/repositories/patient.repository";
import { PatientContactOrmEntity } from "./infrastructure/persistence/patient-contact.orm-entity";
import { TypeOrmPatientContactRepository } from "./infrastructure/persistence/patient-contact.typeorm-repository";
import { PatientNameOrmEntity } from "./infrastructure/persistence/patient-name.orm-entity";
import { TypeOrmPatientNameRepository } from "./infrastructure/persistence/patient-name.typeorm-repository";
import { PatientOrmEntity } from "./infrastructure/persistence/patient.orm-entity";
import { TypeOrmPatientRepository } from "./infrastructure/persistence/patient.typeorm-repository";
import { PatientsController } from "./presentation/http/patients.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientOrmEntity, PatientNameOrmEntity, PatientContactOrmEntity]),
    AuditModule,
    // For SessionGuard/CsrfGuard, injected directly by the controller
    // (07-context-module-map.md: "patients may call identity-access
    // authorization port").
    IdentityAccessModule,
  ],
  controllers: [PatientsController],
  providers: [
    { provide: PATIENT_REPOSITORY, useClass: TypeOrmPatientRepository },
    { provide: PATIENT_NAME_REPOSITORY, useClass: TypeOrmPatientNameRepository },
    { provide: PATIENT_CONTACT_REPOSITORY, useClass: TypeOrmPatientContactRepository },
    { provide: UNIT_OF_WORK_PORT, useClass: TypeOrmUnitOfWork },
    CreatePatientUseCase,
    SearchPatientsUseCase,
  ],
})
export class PatientsModule {}
