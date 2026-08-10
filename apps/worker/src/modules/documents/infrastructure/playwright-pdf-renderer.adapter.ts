import { chromium } from "playwright";
import type { PdfRendererPort } from "../application/ports/pdf-renderer.port";

// ADR-009: "Rendering runs only in the worker with a per-job timeout and
// memory cap." A single dummy-receipt render is small; 30s is generous
// headroom, not a tuned production budget — revisit once real templates
// and real load exist. page.pdf() itself has no timeout option, so the
// budget is enforced by racing the whole render against a timer instead.
const RENDER_TIMEOUT_MS = 30_000;

/**
 * Headless Chromium HTML->PDF (ADR-009's recommended decision): the same
 * bidi/shaping engine already trusted for the RTL web UI, so there's one
 * rendering behavior to test, not two. Launches and closes a fresh
 * browser per render — simplest correct thing for a walking-skeleton
 * proof; reusing one long-lived browser across many queued jobs is a
 * real optimization for later, once there's an actual queue to reuse it
 * across.
 */
export class PlaywrightPdfRendererAdapter implements PdfRendererPort {
  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const browser = await chromium.launch({
      // --no-sandbox: this runs as root inside CI/Docker containers,
      // where Chromium's own sandbox can't set up the namespaces it
      // wants — standard, documented tradeoff for containerized
      // headless rendering, not a general security relaxation (the
      // process only ever renders our own generated HTML, never
      // arbitrary/untrusted content).
      args: ["--no-sandbox"],
    });
    try {
      const pdf = await withTimeout(this.renderInBrowser(browser, html), RENDER_TIMEOUT_MS);
      return normalizeCreationTimestamps(pdf);
    } finally {
      await browser.close();
    }
  }

  private async renderInBrowser(
    browser: Awaited<ReturnType<typeof chromium.launch>>,
    html: string,
  ): Promise<Buffer> {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    return page.pdf({ format: "A4", printBackground: true });
  }
}

// Chromium's Skia PDF backend stamps the current wall-clock time into
// /CreationDate and /ModDate on every render — verified directly: two
// renders of byte-identical HTML produced PDFs differing in exactly those
// two 14-digit timestamps and nowhere else. Left alone, that breaks
// ADR-009's "content hash identical across two renders of the same
// template version + data" requirement for reasons that have nothing to
// do with the actual document content. Overwriting the digits with a
// fixed placeholder of the same length is a same-size in-place patch on
// plain-text dictionary entries (not inside a compressed stream — checked
// against the raw bytes), so it can't shift any byte offset the PDF's own
// xref table depends on.
const PDF_DATE_PATTERN = /\/(CreationDate|ModDate) \(D:\d{14}/g;

function normalizeCreationTimestamps(pdf: Buffer): Buffer {
  const text = pdf.toString("latin1");
  const normalized = text.replace(PDF_DATE_PATTERN, (_match, field: string) => `/${field} (D:19700101000000`);
  return Buffer.from(normalized, "latin1");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`PDF render exceeded ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
