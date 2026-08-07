import { Column, Entity, PrimaryColumn, Unique } from "typeorm";

@Entity({ name: "oidc_authorization_request" })
@Unique("UQ_oidc_authorization_request_state_hash", ["stateHash"])
export class OidcAuthorizationRequestOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "state_hash", type: "varchar" })
  stateHash!: string;

  @Column({ name: "nonce_encrypted", type: "text" })
  nonceEncrypted!: string;

  @Column({ name: "pkce_verifier_encrypted", type: "text" })
  pkceVerifierEncrypted!: string;

  @Column({ name: "return_path", type: "varchar" })
  returnPath!: string;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt!: Date | null;
}
