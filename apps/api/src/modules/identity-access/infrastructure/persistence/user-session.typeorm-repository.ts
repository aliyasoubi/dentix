import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserSession } from "../../domain/entities/user-session.entity";
import { UserSessionRepository } from "../../domain/repositories/user-session.repository";
import { UserSessionMapper } from "../mappers/user-session.mapper";
import { UserSessionOrmEntity } from "./user-session.orm-entity";

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

  async create(session: UserSession): Promise<void> {
    await this.repository.insert(UserSessionMapper.toOrm(session));
  }

  async update(session: UserSession): Promise<void> {
    // save() on an entity carrying the real primary key is an UPDATE here,
    // not a fresh insert — safe per UserSessionMapper.toOrm's doc comment.
    await this.repository.save(UserSessionMapper.toOrm(session));
  }
}
