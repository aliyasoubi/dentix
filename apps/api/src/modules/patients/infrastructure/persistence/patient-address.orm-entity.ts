import { Column, Entity, PrimaryColumn, Unique, VersionColumn } from "typeorm";

@Entity({ name: "patient_address" })
@Unique("UQ_patient_address_patient_id", ["patientId"])
export class PatientAddressOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "patient_id", type: "uuid" })
  patientId!: string;

  @Column({ type: "varchar", nullable: true })
  province!: string | null;

  @Column({ type: "varchar", nullable: true })
  city!: string | null;

  @Column({ type: "varchar", nullable: true })
  district!: string | null;

  @Column({ name: "address_line1", type: "varchar", nullable: true })
  addressLine1!: string | null;

  @Column({ name: "address_line2", type: "varchar", nullable: true })
  addressLine2!: string | null;

  @Column({ name: "postal_code", type: "varchar", nullable: true })
  postalCode!: string | null;

  @Column({ name: "delivery_notes", type: "varchar", nullable: true })
  deliveryNotes!: string | null;

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
