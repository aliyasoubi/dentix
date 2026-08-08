import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TransactionContext } from "@dentix/kernel";
import { UserSession } from "../../domain/entities/user-session.entity";
import { UserSessionRepository } from "../../domain/repositories/user-session.repository";
import { UserSessionOrmEntity } from "./user-session.orm-entity";
import { UserSessionMapper } from "../mappers/user-session.mapper";
import { repositoryFor } from "../../../../platform/typeorm-transaction";

@Injectable()
export class TypeOrmUserSessionRepository implements UserSessionRepository {
  constructor(
    @InjectRepository(UserSessionOrmEntity)
    private readonly repository: Repository<UserSessionOrmEntity>,
  ) {}

  async findByHash(sessionHash: string): Promise<UserSession | null> {
    const record = await this.repository.findOne({ where: { sessionHash } });
    return record ? UserSessionMapper.toDomain(record) : null;
  }

  async create(session: UserSession, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).insert(UserSessionMapper.toOrm(session));
  }

  async touchIfActive(session: UserSession): Promise<boolean> {
    // WHERE revokedAt IS NULL is evaluated against the row as it stands at
    // UPDATE time, not the copy read earlier — the DB, not application
    // code, is what decides whether this touch still applies.
    const result = await this.repository.update(
      { id: session.id, revokedAt: IsNull() },
      { lastSeenAt: session.lastSeenAt, idleExpiresAt: session.idleExpiresAt },
    );
    return (result.affected ?? 0) > 0;
  }

  async revoke(session: UserSession, tx?: TransactionContext): Promise<void> {
    await repositoryFor(this.repository, tx).update(
      { id: session.id, revokedAt: IsNull() },
      { revokedAt: session.revokedAt, revokedReason: session.revokedReason },
    );
  }
}
