import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { asUuid, TransactionContext, Uuid } from "@dentix/kernel";
import { Patient } from "../../domain/entities/patient.entity";
import { PatientRepository, PatientSearchResult } from "../../domain/repositories/patient.repository";
import { PatientMapper } from "../mappers/patient.mapper";
import { PatientOrmEntity } from "./patient.orm-entity";
import { managerFor, repositoryFor } from "../../../../platform/typeorm-transaction";

interface PatientSearchRow {
  readonly id: string;
  readonly patient_number: number;
  readonly native_name: string;
  readonly latin_name: string | null;
  readonly phone: string | null;
  readonly date_of_birth: string | null;
}

/**
 * A search term is a literal, not a pattern. Parameterization already makes
 * this injection-safe, but it does not stop LIKE metacharacters from being
 * interpreted: before this, searching `%` matched every patient in the
 * office, and `_` matched any single character. Escapes the backslash first
 * so an escape introduced here isn't re-escaped, and pairs with an explicit
 * `ESCAPE '\'` in the query (Postgres' default already is a backslash, but
 * standard_conforming_strings makes that worth stating rather than assuming).
 */
function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

@Injectable()
export class TypeOrmPatientRepository implements PatientRepository {
  constructor(
    @InjectRepository(PatientOrmEntity)
    private readonly repository: Repository<PatientOrmEntity>,
  ) {}

  async create(patient: Patient, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(PatientMapper.toOrmForInsert(patient));
  }

  async nextPatientNumber(officeId: Uuid, tx?: TransactionContext): Promise<number> {
    const manager = managerFor(this.repository.manager, tx);
    const rows: Array<{ next_number: number }> = await manager.query(
      `INSERT INTO "patient_number_sequence" ("office_id", "next_number")
       VALUES ($1, 1)
       ON CONFLICT ("office_id")
       DO UPDATE SET "next_number" = "patient_number_sequence"."next_number" + 1
       RETURNING "next_number"`,
      [officeId],
    );
    const row = rows[0];
    if (!row) {
      throw new Error("patient_number_sequence UPSERT returned no row — this should be unreachable");
    }
    return row.next_number;
  }

  async findById(id: Uuid): Promise<Patient | null> {
    const record = await this.repository.findOne({ where: { id } });
    return record ? PatientMapper.toDomain(record) : null;
  }

  async search(params: {
    readonly officeId: Uuid;
    readonly normalizedQuery: string;
    readonly canonicalPhoneQuery: string | null;
    readonly limit: number;
  }): Promise<PatientSearchResult[]> {
    // date_of_birth is cast to text in SQL rather than left as a `date`
    // column: this raw query bypasses TypeORM's own hydration (which
    // treats `date` columns as plain strings), so the pg driver would
    // otherwise parse it into a JS Date at LOCAL midnight — verified
    // directly against Postgres — and reading that back with
    // toISOString() rolls the date backward a day in any timezone west
    // of UTC. Casting in SQL sidesteps the Date object entirely.
    const rows: PatientSearchRow[] = await this.repository.manager.query(
      `
      SELECT
        p."id",
        p."patient_number",
        native."original_value" AS native_name,
        latin."original_value" AS latin_name,
        preferred_contact."original_value" AS phone,
        p."date_of_birth"::text AS date_of_birth
      FROM "patient" p
      LEFT JOIN "patient_name" native
        ON native."patient_id" = p."id" AND native."name_type" = 'native' AND native."is_current" = true
      LEFT JOIN "patient_name" latin
        ON latin."patient_id" = p."id" AND latin."name_type" = 'latin' AND latin."is_current" = true
      LEFT JOIN "patient_contact" preferred_contact
        ON preferred_contact."patient_id" = p."id" AND preferred_contact."is_preferred" = true
      WHERE p."office_id" = $1
        AND (
          $2 = ''
          OR native."normalized_value" ILIKE '%' || $5 || '%' ESCAPE '\\'
          OR latin."normalized_value" ILIKE '%' || $5 || '%' ESCAPE '\\'
          OR ($3::varchar IS NOT NULL AND preferred_contact."normalized_value" = $3)
        )
      ORDER BY p."created_at" DESC
      LIMIT $4
      `,
      [
        params.officeId,
        params.normalizedQuery,
        params.canonicalPhoneQuery,
        params.limit,
        escapeLikePattern(params.normalizedQuery),
      ],
    );

    return rows.map((row) => ({
      id: asUuid(row.id),
      patientNumber: row.patient_number,
      nativeName: row.native_name,
      latinName: row.latin_name,
      phone: row.phone,
      dateOfBirth: row.date_of_birth,
    }));
  }
}
