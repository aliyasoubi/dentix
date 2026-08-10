import { config } from "dotenv";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { DUMMY_RECEIPT_FIXTURE } from "./modules/documents/domain/receipt-fixture";
import { RenderReceiptUseCase } from "./modules/documents/application/render-receipt.use-case";
import { LocalTemplateAssetsAdapter } from "./modules/documents/infrastructure/local-template-assets.adapter";
import { PlaywrightPdfRendererAdapter } from "./modules/documents/infrastructure/playwright-pdf-renderer.adapter";
import { S3ObjectStorageAdapter } from "./modules/documents/infrastructure/s3-object-storage.adapter";
import { findRepoRoot } from "./platform/find-repo-root";

// Same one-shared-.env pattern as apps/api/src/persistence/data-source.ts.
const repoRoot = findRepoRoot(__dirname);
if (repoRoot) {
  config({ path: join(repoRoot, ".env"), quiet: true });
}

/**
 * Renders the ADR-009 dummy-receipt fixture and uploads it, for local/CI
 * verification (`npm run render:receipt-fixture --workspace apps/worker`)
 * and for the S7 human check. Not a queue consumer — this walking
 * skeleton proves the rendering pipeline itself; wiring a real job queue
 * is deferred until an actual asynchronous workflow needs it
 * (07-plans/00-build-sequencing.md).
 */
async function main(): Promise<void> {
  const useCase = new RenderReceiptUseCase(
    new LocalTemplateAssetsAdapter(),
    new PlaywrightPdfRendererAdapter(),
    new S3ObjectStorageAdapter({
      endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
      bucket: process.env.MINIO_BUCKET ?? "dentix-documents-dev",
      accessKeyId: process.env.MINIO_ROOT_USER ?? "dentix",
      secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "dentix_dev_only",
    }),
  );

  const result = await useCase.execute(DUMMY_RECEIPT_FIXTURE);

  const outDir = join(__dirname, "..", "tmp");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "receipt-fixture.pdf");
  await writeFile(outPath, result.pdf);

  console.log(`Rendered ${result.pdf.byteLength} bytes.`);
  console.log(`Content hash (SHA-256): ${result.contentHashSha256}`);
  console.log(`Object storage key: ${result.objectKey}`);
  console.log(`Local copy: ${outPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
