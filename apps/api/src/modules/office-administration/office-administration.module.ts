import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OFFICE_REPOSITORY } from "./domain/repositories/office.repository";
import { OfficeOrmEntity } from "./infrastructure/persistence/office.orm-entity";
import { TypeOrmOfficeRepository } from "./infrastructure/persistence/office.typeorm-repository";

@Module({
  imports: [TypeOrmModule.forFeature([OfficeOrmEntity])],
  providers: [{ provide: OFFICE_REPOSITORY, useClass: TypeOrmOfficeRepository }],
  exports: [OFFICE_REPOSITORY],
})
export class OfficeAdministrationModule {}
