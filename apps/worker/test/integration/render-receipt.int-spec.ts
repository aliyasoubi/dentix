import { DUMMY_RECEIPT_FIXTURE } from "../../src/modules/documents/domain/receipt-fixture";
import { RenderReceiptUseCase } from "../../src/modules/documents/application/render-receipt.use-case";
import { LocalTemplateAssetsAdapter } from "../../src/modules/documents/infrastructure/local-template-assets.adapter";
import { PlaywrightPdfRendererAdapter } from "../../src/modules/documents/infrastructure/playwright-pdf-renderer.adapter";
import { S3ObjectStorageAdapter } from "../../src/modules/documents/infrastructure/s3-object-storage.adapter";

const PDF_MAGIC_BYTES = "%PDF-";

function buildStorage(): S3ObjectStorageAdapter {
  return new S3ObjectStorageAdapter({
    endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
    bucket: process.env.MINIO_BUCKET ?? "dentix-documents-dev",
    accessKeyId: process.env.MINIO_ROOT_USER ?? "dentix",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "dentix_dev_only",
  });
}

function buildUseCase(): RenderReceiptUseCase {
  return new RenderReceiptUseCase(
    new LocalTemplateAssetsAdapter(),
    new PlaywrightPdfRendererAdapter(),
    buildStorage(),
  );
}

// ADR-009's acceptance checklist, proven against real Chromium and real
// (MinIO) S3-compatible storage — no mocks: "constraints are the point"
// applies just as much to a rendering/storage pipeline as to a database.
describe("RenderReceiptUseCase (ADR-009)", () => {
  jest.setTimeout(60_000);

  it("renders the dummy receipt fixture to a real PDF", async () => {
    const result = await buildUseCase().execute(DUMMY_RECEIPT_FIXTURE);

    expect(result.pdf.byteLength).toBeGreaterThan(1000);
    expect(result.pdf.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC_BYTES);
  });

  it("produces an identical content hash across two renders of the same template version and data", async () => {
    const first = await buildUseCase().execute(DUMMY_RECEIPT_FIXTURE);
    const second = await buildUseCase().execute(DUMMY_RECEIPT_FIXTURE);

    expect(second.contentHashSha256).toBe(first.contentHashSha256);
    expect(second.objectKey).toBe(first.objectKey);
    // The PDF bytes themselves, not just the hash, are identical —
    // confirms the hash isn't coincidentally stable while the render
    // silently drifts (e.g. an embedded timestamp would break this).
    expect(second.pdf.equals(first.pdf)).toBe(true);
  });

  it("uploads to object storage under the content-addressed key, retrievable byte-for-byte", async () => {
    const storage = buildStorage();
    const useCase = new RenderReceiptUseCase(
      new LocalTemplateAssetsAdapter(),
      new PlaywrightPdfRendererAdapter(),
      storage,
    );

    const result = await useCase.execute(DUMMY_RECEIPT_FIXTURE);
    const downloaded = await storage.download(result.objectKey);

    expect(downloaded.equals(result.pdf)).toBe(true);
  });

  it("hashes to a different key when the underlying data changes", async () => {
    const useCase = buildUseCase();
    const first = await useCase.execute(DUMMY_RECEIPT_FIXTURE);
    const second = await useCase.execute({ ...DUMMY_RECEIPT_FIXTURE, amountRial: 30_000_000n });

    expect(second.contentHashSha256).not.toBe(first.contentHashSha256);
  });
});
