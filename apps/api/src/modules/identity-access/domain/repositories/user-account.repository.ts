import { TransactionContext, Uuid } from "@dentix/kernel";
import { UserAccount } from "../entities/user-account.entity";

export interface UserAccountRepository {
  findByExternalIdentity(issuer: string, externalSubject: string): Promise<UserAccount | null>;
  findById(id: Uuid): Promise<UserAccount | null>;
  /**
   * Optional tx: this port existed before anything in application code
   * actually called create() (only the dev bootstrap script did, via the
   * raw ORM repository, outside any transaction). AddOfficeUserUseCase is
   * the first real caller, and it needs this enlisted in the same
   * transaction as the office_user row it creates alongside it.
   */
  create(userAccount: UserAccount, tx?: TransactionContext): Promise<void>;
}

export const USER_ACCOUNT_REPOSITORY = Symbol("USER_ACCOUNT_REPOSITORY");
