/** Mirrors GET /api/v1/auth/whoami's success body (identity-access's GetSessionUseCase). */
export interface CurrentSession {
  readonly userId: string;
  readonly officeId: string;
  readonly displayName: string;
  readonly permissionVersion: number;
  readonly authenticatedAt: string;
  readonly isRecentlyAuthenticated: boolean;
}
