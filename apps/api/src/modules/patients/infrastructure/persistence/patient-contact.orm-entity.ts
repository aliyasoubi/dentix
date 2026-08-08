import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity({ name: "patient_contact" })
export class PatientContactOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Index("IX_patient_contact_patient_id")
  @Column({ name: "patient_id", type: "uuid" })
  patientId!: string;

  @Column({ name: "contact_type", type: "varchar" })
  contactType!: string;

  @Column({ name: "original_value", type: "varchar" })
  originalValue!: string;

  @Index("IX_patient_contact_normalized_value")
  @Column({ name: "normalized_value", type: "varchar" })
  normalizedValue!: string;

  @Column({ name: "is_preferred", type: "boolean", default: true })
  isPreferred!: boolean;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "created_by", type: "uuid" })
  createdBy!: string;
}
