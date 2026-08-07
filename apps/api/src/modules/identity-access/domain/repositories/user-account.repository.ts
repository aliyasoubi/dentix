import { Uuid } from "@dentix/kernel";
import { UserAccount } from "../entities/user-account.entity";

export interface UserAccountRepository {
  findByExternalIdentity(issuer: string, externalSubject: string): Promise<UserAccount | null>;
  findById(id: Uuid): Promise<UserAccount | null>;
  create(userAccount: UserAccount): Promise<void>;
}

export const USER_ACCOUNT_REPOSITORY = Symbol("USER_ACCOUNT_REPOSITORY");
