import { Controller, Get } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

interface HealthStatus {
  readonly status: "ok";
}

/**
 * Unversioned liveness probe for local dev, CI smoke checks (S9), and the
 * eventual deployment smoke script. Not part of the /api/v1 contract.
 */
@ApiExcludeController()
@Controller("health")
export class HealthController {
  @Get()
  check(): HealthStatus {
    return { status: "ok" };
  }
}
