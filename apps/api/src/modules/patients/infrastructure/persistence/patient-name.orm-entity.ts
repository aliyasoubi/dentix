import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity({ name: "patient_name" })
export class PatientNameOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Index("IX_patient_name_patient_id")
  @Column({ name: "patient_id", type: "uuid" })
  patientId!: string;

  @Column({ name: "name_type", type: "varchar" })
  nameType!: string;

  @Column({ name: "original_value", type: "varchar" })
  originalValue!: string;

  @Index("IX_patient_name_normalized_value")
  @Column({ name: "normalized_value", type: "varchar" })
  normalizedValue!: string;

  @Column({ name: "is_current", type: "boolean", default: true })
  isCurrent!: boolean;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "created_by", type: "uuid" })
  createdBy!: string;
}
