import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";

/**
 * Single source of truth for the OpenAPI document config — both the
 * committed-contract generator (scripts/generate-openapi.ts) and the live
 * Swagger UI (main.ts) build from exactly this, so they can never drift
 * against each other.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("Dentix API")
    .setDescription("Farsi-first single-office dental PMS — REST contract (05-api-guidelines.md)")
    .setVersion("0.5.0")
    .addCookieAuth("__Host-dentix_session")
    .build();

  return SwaggerModule.createDocument(app, config);
}
