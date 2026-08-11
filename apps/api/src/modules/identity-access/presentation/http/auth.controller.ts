import { Controller, Get, HttpCode, Post, Req, Res, UseFilters, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { CompleteLoginUseCase } from "../../application/use-cases/complete-login.use-case";
import { GetSessionUseCase } from "../../application/use-cases/get-session.use-case";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { StartLoginUseCase } from "../../application/use-cases/start-login.use-case";
import { SESSION_POLICY } from "../../domain/value-objects/session-policy";
import { CurrentSession } from "../decorators/current-session.decorator";
import { CsrfGuard } from "../guards/csrf.guard";
import { SessionGuard } from "../guards/session.guard";
import { UserSession } from "../../domain/entities/user-session.entity";
import { HttpErrorFilter } from "../../../../platform/http-error.filter";
import { ErrorResponseDto } from "../../../../platform/dto/error-response.dto";
import { clearSessionCookies, SESSION_COOKIE_NAME, setSessionCookies } from "./cookies";
import { LogoutResponseDto } from "./dto/logout-response.dto";
import { WhoAmIResponseDto } from "./dto/whoami-response.dto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

/**
 * 09-authentication-session-architecture.md end to end. Login/callback are
 * top-level browser navigations (redirects both ways), not fetch/XHR — an
 * OIDC Authorization Code redirect can't be driven through an API client.
 */
@ApiTags("auth")
@Controller("auth")
@UseFilters(HttpErrorFilter)
export class AuthController {
  constructor(
    private readonly startLogin: StartLoginUseCase,
    private readonly completeLogin: CompleteLoginUseCase,
    private readonly getSession: GetSessionUseCase,
    private readonly logout: LogoutUseCase,
  ) {}

  @Get("login")
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: "Start the OIDC login redirect (top-level browser navigation, not an XHR call)" })
  @ApiResponse({ status: 302, description: "Redirect to the OIDC provider's authorization endpoint." })
  @ApiResponse({ status: 400, type: ErrorResponseDto, description: "Malformed returnTo path." })
  async login(@Req() request: Request, @Res() response: Response): Promise<void> {
    const returnTo = typeof request.query["returnTo"] === "string" ? request.query["returnTo"] : "/";
    const result = await this.startLogin.execute({ returnPath: returnTo });
    if (!result.ok) {
      // A malformed client-supplied returnTo is the caller's mistake, not
      // ours — 400, not the 500 an uncaught exception would have produced.
      response.status(400).json({ code: result.code });
      return;
    }
    response.redirect(result.value.authorizationUrl.toString());
  }

  @Get("callback")
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: "OIDC authorization-code callback; sets the BFF session cookies and redirects" })
  @ApiResponse({
    status: 302,
    description: "Redirect back into the app, authenticated (or to /login?error=... on failure).",
  })
  async callback(@Req() request: Request, @Res() response: Response): Promise<void> {
    const appBaseUrl = requireEnv("APP_BASE_URL");
    const callbackUrl = new URL(request.originalUrl, appBaseUrl);

    const result = await this.completeLogin.execute({ callbackUrl });
    if (!result.ok) {
      response.redirect(`${appBaseUrl}/login?error=${result.code}`);
      return;
    }

    setSessionCookies(response, {
      sessionToken: result.value.sessionToken,
      csrfToken: result.value.csrfToken,
      maxAgeMs: SESSION_POLICY.absoluteLifetimeMs,
    });
    response.redirect(`${appBaseUrl}${result.value.returnPath}`);
  }

  @Get("whoami")
  @ApiOperation({ summary: "Identify the current session, if any" })
  @ApiOkResponse({ type: WhoAmIResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto, description: "No session, or an invalid/expired one." })
  async whoami(@Req() request: Request, @Res() response: Response): Promise<void> {
    const sessionToken = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE_NAME];
    if (!sessionToken) {
      response.status(401).json({ code: "NO_SESSION" });
      return;
    }

    const result = await this.getSession.execute({ sessionToken });
    if (!result.ok) {
      response.status(401).json({ code: result.code });
      return;
    }

    response.status(200).json({
      userId: result.value.userId,
      officeId: result.value.officeId,
      displayName: result.value.displayName,
      permissionVersion: result.value.permissionVersion,
      authenticatedAt: result.value.authenticatedAt.toISOString(),
      isRecentlyAuthenticated: result.value.isRecentlyAuthenticated,
    });
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(SessionGuard, CsrfGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Revoke the current Dentix session" })
  @ApiOkResponse({ type: LogoutResponseDto })
  async logoutHandler(@CurrentSession() session: UserSession, @Res() response: Response): Promise<void> {
    const appBaseUrl = requireEnv("APP_BASE_URL");
    const { providerEndSessionUrl } = await this.logout.execute({
      session,
      postLogoutRedirectUri: appBaseUrl,
    });

    clearSessionCookies(response);
    response.status(200).json({ providerEndSessionUrl: providerEndSessionUrl.toString() });
  }
}
