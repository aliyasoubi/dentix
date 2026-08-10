import { readFile } from "fs/promises";
import path from "path";
import type { EmbeddedFonts } from "../domain/receipt-template";
import type { TemplateAssetsPort } from "../application/ports/template-assets.port";
import { findRepoRoot } from "../../../platform/find-repo-root";

// require.resolve, not a hardcoded node_modules path: works whether npm
// hoists `vazirmatn` to the workspace root or nests it under this
// package, matching whatever the installed layout actually is.
const VAZIRMATN_DIR = path.dirname(require.resolve("vazirmatn/package.json"));
const REGULAR_FONT_PATH = path.join(VAZIRMATN_DIR, "fonts", "webfonts", "Vazirmatn-Regular.woff2");
const BOLD_FONT_PATH = path.join(VAZIRMATN_DIR, "fonts", "webfonts", "Vazirmatn-Bold.woff2");

/** Reads local static assets once per process and caches them — they never change while the worker is running. */
export class LocalTemplateAssetsAdapter implements TemplateAssetsPort {
  private fontsCache: EmbeddedFonts | null = null;
  private brandIconCache: string | null = null;

  async loadVazirmatnFonts(): Promise<EmbeddedFonts> {
    if (!this.fontsCache) {
      const [regular, bold] = await Promise.all([readFile(REGULAR_FONT_PATH), readFile(BOLD_FONT_PATH)]);
      this.fontsCache = {
        regularBase64: regular.toString("base64"),
        boldBase64: bold.toString("base64"),
      };
    }
    return this.fontsCache;
  }

  async loadBrandIconSvg(): Promise<string> {
    if (!this.brandIconCache) {
      this.brandIconCache = await readFile(this.resolveBrandIconPath(), "utf-8");
    }
    return this.brandIconCache;
  }

  // 06-brand-identity.md: "Receipts, statements, consents, watermarks,
  // and low-color print" use the monochrome icon, not the full-color
  // lockup. Reached via the monorepo's shared assets/brand/ — this is a
  // dev/CI-shaped resolution (see findRepoRoot's own docstring); a real
  // production package built from apps/worker/dist/ alone would need the
  // asset copied into its own build output instead of reached across the
  // monorepo tree at runtime. Deferred, not silently assumed away: this
  // walking skeleton doesn't build or ship a production image yet.
  private resolveBrandIconPath(): string {
    const repoRoot = findRepoRoot(__dirname);
    if (!repoRoot) {
      throw new Error(
        "Could not locate the monorepo root (no docker-compose.yml found walking up from " +
          `${__dirname}) to resolve assets/brand/dentix-icon-monochrome.svg.`,
      );
    }
    return path.join(repoRoot, "assets", "brand", "dentix-icon-monochrome.svg");
  }
}
