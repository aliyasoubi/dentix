import type { EmbeddedFonts } from "../../domain/receipt-template";

/**
 * Local static assets the template needs — fonts and the brand icon.
 * A port, not a plain file read, so the pure template function
 * (domain/receipt-template.ts) never touches the filesystem itself and
 * stays trivially unit-testable. Supplies font bytes as base64 data,
 * never a network URL — ADR-009: "no network fetch at render time."
 */
export interface TemplateAssetsPort {
  loadVazirmatnFonts(): Promise<EmbeddedFonts>;
  loadBrandIconSvg(): Promise<string>;
}
