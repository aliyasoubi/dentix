import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

/**
 * Walks up from `startDir` to find @dentix/api's own package.json — not
 * the monorepo root's (find-repo-root.ts's docker-compose.yml anchor is a
 * dev-only file that a production image built from dist/ + package.json
 * alone would never ship), since package.json itself ships in every real
 * deployment shape (node needs it to resolve dependencies).
 */
export function readAppVersion(startDir: string): string {
  let dir = startDir;
  for (;;) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      const pkg = JSON.parse(readFileSync(candidate, "utf8")) as { name?: string; version?: string };
      if (pkg.name === "@dentix/api" && pkg.version) {
        return pkg.version;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("Could not locate @dentix/api's package.json to read the app version");
    }
    dir = parent;
  }
}
