/** Renders a self-contained HTML document (no network fetch) to PDF bytes. */
export interface PdfRendererPort {
  renderHtmlToPdf(html: string): Promise<Buffer>;
}
