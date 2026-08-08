import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TransactionContext } from "@dentix/kernel";
import { UnitOfWorkPort } from "../../application/ports/unit-of-work.port";
import { TypeOrmTransactionContext } from "./typeorm-transaction";

@Injectable()
export class TypeOrmUnitOfWork implements UnitOfWorkPort {
  constructor(private readonly dataSource: DataSource) {}

  async runInTransaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const tx: TypeOrmTransactionContext = { _brand: "TransactionContext", manager };
      return work(tx);
    });
  }
}
