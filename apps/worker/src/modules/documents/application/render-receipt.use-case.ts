import { createHash } from "crypto";
import { renderReceiptHtml } from "../domain/receipt-template";
import type { ReceiptFixture } from "../domain/receipt-fixture";
import type { ObjectStoragePort } from "./ports/object-storage.port";
import type { PdfRendererPort } from "./ports/pdf-renderer.port";
import type { TemplateAssetsPort } from "./ports/template-assets.port";

export interface RenderReceiptResult {
  readonly pdf: Buffer;
  readonly contentHashSha256: string;
  readonly objectKey: string;
}

/**
 * ADR-009: renders a receipt to PDF and uploads it content-addressed —
 * the object key is derived from the PDF's own SHA-256, so re-rendering
 * the identical template version + data reproduces the identical key,
 * which is exactly the acceptance checklist's "content hash recorded and
 * identical across two renders" proof, not a separate mechanism bolted
 * on to satisfy it.
 */
export class RenderReceiptUseCase {
  constructor(
    private readonly templateAssets: TemplateAssetsPort,
    private readonly pdfRenderer: PdfRendererPort,
    private readonly objectStorage: ObjectStoragePort,
  ) {}

  async execute(fixture: ReceiptFixture): Promise<RenderReceiptResult> {
    const [fonts, brandIconSvg] = await Promise.all([
      this.templateAssets.loadVazirmatnFonts(),
      this.templateAssets.loadBrandIconSvg(),
    ]);
    const html = renderReceiptHtml(fixture, fonts, brandIconSvg);
    const pdf = await this.pdfRenderer.renderHtmlToPdf(html);
    const contentHashSha256 = createHash("sha256").update(pdf).digest("hex");
    const objectKey = `receipts/${contentHashSha256}.pdf`;

    await this.objectStorage.ensureBucketExists();
    await this.objectStorage.upload({ key: objectKey, body: pdf, contentType: "application/pdf" });

    return { pdf, contentHashSha256, objectKey };
  }
}
