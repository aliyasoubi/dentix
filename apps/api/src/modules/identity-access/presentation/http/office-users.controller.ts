import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AddOfficeUserUseCase } from "../../application/use-cases/add-office-user.use-case";
import { CurrentSession } from "../decorators/current-session.decorator";
import { CsrfGuard } from "../guards/csrf.guard";
import { SessionGuard } from "../guards/session.guard";
import { UserSession } from "../../domain/entities/user-session.entity";
import { HttpErrorFilter } from "../../../../platform/http-error.filter";
import { ErrorResponseDto } from "../../../../platform/dto/error-response.dto";
import { AddOfficeUserRequestDto } from "./dto/add-office-user-request.dto";
import { AddOfficeUserResponseDto } from "./dto/add-office-user-response.dto";

/**
 * The minimal admin-facing "add a user" flow — see AddOfficeUserUseCase's
 * own comment for what this deliberately is and isn't. office_id always
 * comes from the session, never a client-supplied value, same rule
 * patients.controller.ts follows (04-data-model.md).
 */
@ApiTags("office-users")
@ApiCookieAuth()
@Controller("office-users")
@UseGuards(SessionGuard, CsrfGuard)
@UseFilters(HttpErrorFilter)
export class OfficeUsersController {
  constructor(private readonly addOfficeUser: AddOfficeUserUseCase) {}

  @Post()
  @ApiOperation({ summary: "Link an existing identity-provider account to this office" })
  @ApiBody({ type: AddOfficeUserRequestDto })
  @ApiResponse({ status: 201, type: AddOfficeUserResponseDto })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description:
      "FORBIDDEN (actor is not an office admin) or RECENT_AUTHENTICATION_REQUIRED (session authenticated too long ago for permission administration).",
  })
  @ApiResponse({
    status: 400,
    type: ErrorResponseDto,
    description: "e.g. NOT_FOUND_IN_PROVIDER, ALREADY_LINKED, PROVIDER_ACCOUNT_DISABLED",
  })
  async create(
    @CurrentSession() session: UserSession,
    @Body() body: AddOfficeUserRequestDto,
  ): Promise<AddOfficeUserResponseDto> {
    const result = await this.addOfficeUser.execute({
      officeId: session.officeId,
      actorUserId: session.userId,
      email: body.email,
      authenticatedAt: session.authenticatedAt,
    });
    if (!result.ok) {
      // RECENT_AUTHENTICATION_REQUIRED is a 403, not a 401: the session is
      // perfectly valid, it just authenticated too long ago for this
      // particular action. A 401 would be caught by the SPA's generic
      // session-expired interceptor and send the user through a plain
      // login that wouldn't refresh authenticatedAt if the provider still
      // has an SSO session — the client needs to see this code and ask for
      // `prompt=login` instead.
      if (result.code === "FORBIDDEN" || result.code === "RECENT_AUTHENTICATION_REQUIRED") {
        throw new ForbiddenException(result.code);
      }
      throw new BadRequestException(result.code);
    }
    return { officeUserId: result.value.officeUserId };
  }
}
