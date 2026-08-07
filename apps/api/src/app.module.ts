import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthController } from "./health.controller";
import { OfficeAdministrationModule } from "./modules/office-administration/office-administration.module";
import { dataSourceOptions } from "./persistence/data-source";

@Module({
  imports: [TypeOrmModule.forRoot(dataSourceOptions), OfficeAdministrationModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
