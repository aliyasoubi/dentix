import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity({ name: "patient_identifier" })
export class PatientIdentifierOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Index("IX_patient_identifier_patient_id")
  @Column({ name: "patient_id", type: "uuid" })
  patientId!: string;

  @Column({ name: "identifier_type", type: "varchar" })
  identifierType!: string;

  @Column({ name: "original_value", type: "varchar" })
  originalValue!: string;

  @Index("IX_patient_identifier_normalized_value")
  @Column({ name: "normalized_value", type: "varchar" })
  normalizedValue!: string;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "created_by", type: "uuid" })
  createdBy!: string;
}
