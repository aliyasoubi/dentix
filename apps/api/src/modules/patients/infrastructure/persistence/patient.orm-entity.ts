import { Column, Entity, Index, PrimaryColumn, Unique, VersionColumn } from "typeorm";

/**
 * ORM shape only — domain/ and API responses see Patient via
 * PatientMapper (03-module-boundaries.md). dateOfBirth is typed as a
 * plain ISO date string, matching TypeORM's actual runtime behavior for
 * a `date`-typed column (no time/timezone component) — PatientMapper
 * converts to/from the domain entity's `Date | null`.
 */
@Entity({ name: "patient" })
@Unique("UQ_patient_office_patient_number", ["officeId", "patientNumber"])
export class PatientOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Index("IX_patient_office_id")
  @Column({ name: "office_id", type: "uuid" })
  officeId!: string;

  @Column({ name: "patient_number", type: "integer" })
  patientNumber!: number;

  @Column({ type: "varchar", default: "active" })
  status!: string;

  @Column({ name: "date_of_birth", type: "date", nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: "varchar", default: "unspecified" })
  sex!: string;

  @Column({ name: "contact_unavailable", type: "boolean", default: false })
  contactUnavailable!: boolean;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "created_by", type: "uuid" })
  createdBy!: string;

  @Column({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @Column({ name: "updated_by", type: "uuid" })
  updatedBy!: string;

  @VersionColumn()
  version!: number;

  @Column({ name: "archived_at", type: "timestamptz", nullable: true })
  archivedAt!: Date | null;

  @Column({ name: "archived_by", type: "uuid", nullable: true })
  archivedBy!: string | null;
}
