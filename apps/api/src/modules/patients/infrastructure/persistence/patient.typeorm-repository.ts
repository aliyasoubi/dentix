import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { asUuid, TransactionContext, Uuid } from "@dentix/kernel";
import {
  Patient,
  PatientNationality,
  PatientPreferredLanguage,
  PatientSex,
  PatientStatus,
} from "../../domain/entities/patient.entity";
import {
  PatientDetail,
  PatientRepository,
  PatientSearchResult,
} from "../../domain/repositories/patient.repository";
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

interface PatientDetailRow {
  readonly id: string;
  readonly patient_number: number;
  readonly status: string;
  readonly sex: string;
  readonly nationality: string;
  readonly contact_unavailable: boolean;
  readonly date_of_birth: string | null;
  readonly version: number;
  readonly native_name: string;
  readonly latin_name: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly identifier_number: string | null;
  readonly province: string | null;
  readonly city: string | null;
  readonly district: string | null;
  readonly address_line1: string | null;
  readonly address_line2: string | null;
  readonly postal_code: string | null;
  readonly delivery_notes: string | null;
  readonly occupation: string | null;
  readonly referral_source: string | null;
  readonly preferred_language: string;
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
    readonly patientNumberQuery: number | null;
    readonly limit: number;
  }): Promise<PatientSearchResult[]> {
    // date_of_birth is cast to text in SQL rather than left as a `date`
    // column: this raw query bypasses TypeORM's own hydration (which
    // treats `date` columns as plain strings), so the pg driver would
    // otherwise parse it into a JS Date at LOCAL midnight — verified
    // directly against Postgres — and reading that back with
    // toISOString() rolls the date backward a day in any timezone west
    // of UTC. Casting in SQL sidesteps the Date object entirely.
    //
    // preferred_contact is scoped to contact_type = 'mobile_phone', not
    // just is_preferred = true: since an email row can also carry
    // is_preferred = true (PatientContact's own comment), an unscoped
    // join could match two rows per patient and multiply the result set.
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
        ON preferred_contact."patient_id" = p."id"
        AND preferred_contact."contact_type" = 'mobile_phone'
        AND preferred_contact."is_preferred" = true
      WHERE p."office_id" = $1
        AND (
          $2 = ''
          OR native."normalized_value" ILIKE '%' || $5 || '%' ESCAPE '\\'
          OR latin."normalized_value" ILIKE '%' || $5 || '%' ESCAPE '\\'
          OR ($3::varchar IS NOT NULL AND preferred_contact."normalized_value" = $3)
          OR ($6::integer IS NOT NULL AND p."patient_number" = $6)
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
        params.patientNumberQuery,
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

  async findDetailById(officeId: Uuid, id: Uuid): Promise<PatientDetail | null> {
    // patient_identifier and patient_address have no is_current/history
    // flag (unlike patient_name) — at most one row per patient exists in
    // practice today (create-only, and the edit path updates those rows
    // in place rather than appending), so a plain LEFT JOIN can't
    // multiply the patient row. patient_contact is scoped to
    // (contact_type, is_preferred = true) — same reasoning as search()'s
    // own comment — with a separate join per type so a phone row and an
    // email row coexisting can't multiply it either.
    const rows: PatientDetailRow[] = await this.repository.manager.query(
      `
      SELECT
        p."id",
        p."patient_number",
        p."status",
        p."sex",
        p."nationality",
        p."contact_unavailable",
        p."date_of_birth"::text AS date_of_birth,
        p."version",
        native."original_value" AS native_name,
        latin."original_value" AS latin_name,
        phone_contact."original_value" AS phone,
        email_contact."original_value" AS email,
        identifier."original_value" AS identifier_number,
        addr."province",
        addr."city",
        addr."district",
        addr."address_line1",
        addr."address_line2",
        addr."postal_code",
        addr."delivery_notes",
        p."occupation",
        p."referral_source",
        p."preferred_language"
      FROM "patient" p
      LEFT JOIN "patient_name" native
        ON native."patient_id" = p."id" AND native."name_type" = 'native' AND native."is_current" = true
      LEFT JOIN "patient_name" latin
        ON latin."patient_id" = p."id" AND latin."name_type" = 'latin' AND latin."is_current" = true
      LEFT JOIN "patient_contact" phone_contact
        ON phone_contact."patient_id" = p."id"
        AND phone_contact."contact_type" = 'mobile_phone'
        AND phone_contact."is_preferred" = true
      LEFT JOIN "patient_contact" email_contact
        ON email_contact."patient_id" = p."id"
        AND email_contact."contact_type" = 'email'
        AND email_contact."is_preferred" = true
      LEFT JOIN "patient_identifier" identifier
        ON identifier."patient_id" = p."id"
      LEFT JOIN "patient_address" addr
        ON addr."patient_id" = p."id"
      WHERE p."office_id" = $1 AND p."id" = $2
      `,
      [officeId, id],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: asUuid(row.id),
      patientNumber: row.patient_number,
      status: row.status as PatientStatus,
      nativeName: row.native_name,
      latinName: row.latin_name,
      phone: row.phone,
      contactUnavailable: row.contact_unavailable,
      email: row.email,
      dateOfBirth: row.date_of_birth,
      sex: row.sex as PatientSex,
      nationality: row.nationality as PatientNationality,
      identifierNumber: row.identifier_number,
      province: row.province,
      city: row.city,
      district: row.district,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      postalCode: row.postal_code,
      deliveryNotes: row.delivery_notes,
      occupation: row.occupation,
      referralSource: row.referral_source,
      preferredLanguage: row.preferred_language as PatientPreferredLanguage,
      version: row.version,
    };
  }

  async updateDemographics(
    params: {
      readonly officeId: Uuid;
      readonly id: Uuid;
      readonly expectedVersion: number;
      readonly dateOfBirth: Date | null;
      readonly sex: PatientSex;
      readonly nationality: PatientNationality;
      readonly contactUnavailable: boolean;
      readonly occupation: string | null;
      readonly referralSource: string | null;
      readonly updatedBy: Uuid;
      readonly now: Date;
    },
    tx?: TransactionContext,
  ): Promise<boolean> {
    const manager = managerFor(this.repository.manager, tx);
    // TypeORM's Postgres driver returns UPDATE/DELETE results as a
    // [rows, rowCount] TUPLE from a raw manager.query() call — unlike a
    // plain SELECT (search(), above) or an INSERT...RETURNING
    // (nextPatientNumber, above), which both return the rows array
    // directly. Destructuring `rows` out of that tuple (rather than
    // treating the whole return value as the rows array) is the whole
    // point: `[[], 0].length` is 2 and would always be truthy, silently
    // reporting every version conflict as a success.
    const [rows]: [Array<{ version: number }>, number] = await manager.query(
      `
      UPDATE "patient"
      SET "date_of_birth" = $1,
          "sex" = $2,
          "nationality" = $3,
          "contact_unavailable" = $4,
          "occupation" = $5,
          "referral_source" = $6,
          "updated_at" = $7,
          "updated_by" = $8,
          "version" = "version" + 1
      WHERE "id" = $9 AND "office_id" = $10 AND "version" = $11
      RETURNING "version"
      `,
      [
        params.dateOfBirth ? params.dateOfBirth.toISOString().slice(0, 10) : null,
        params.sex,
        params.nationality,
        params.contactUnavailable,
        params.occupation,
        params.referralSource,
        params.now,
        params.updatedBy,
        params.id,
        params.officeId,
        params.expectedVersion,
      ],
    );
    return rows.length > 0;
  }
}
