import { asUuid } from "@dentix/kernel";
import { UserAccount, UserAccountState } from "../../domain/entities/user-account.entity";
import { UserAccountOrmEntity } from "../persistence/user-account.orm-entity";

export class UserAccountMapper {
  static toDomain(record: UserAccountOrmEntity): UserAccount {
    return UserAccount.reconstitute({
      id: asUuid(record.id),
      externalSubject: record.externalSubject,
      issuer: record.issuer,
      displayName: record.displayName,
      state: record.state as UserAccountState,
    });
  }

  static toOrmForInsert(userAccount: UserAccount): UserAccountOrmEntity {
    const record = new UserAccountOrmEntity();
    record.id = userAccount.id;
    record.externalSubject = userAccount.externalSubject;
    record.issuer = userAccount.issuer;
    record.displayName = userAccount.displayName;
    record.state = userAccount.state;
    record.createdAt = new Date();
    record.createdBy = null;
    record.updatedAt = new Date();
    record.updatedBy = null;
    record.archivedAt = null;
    record.archivedBy = null;
    return record;
  }
}
