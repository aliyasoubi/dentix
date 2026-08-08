import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthController } from "./health.controller";
import { IdentityAccessModule } from "./modules/identity-access/identity-access.module";
import { OfficeAdministrationModule } from "./modules/office-administration/office-administration.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { dataSourceOptions } from "./persistence/data-source";

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    OfficeAdministrationModule,
    IdentityAccessModule,
    PatientsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
