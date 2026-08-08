import { existsSync } from "fs";
import { dirname, join } from "path";

/**
 * Walks up from `startDir` to find the monorepo root, identified by
 * `docker-compose.yml` (a real, stable, root-only file). A fixed hop
 * count would be correct from ts-node (running against source, e.g.
 * `apps/api/src/...`) but wrong from the compiled build
 * (`apps/api/dist/src/...` — `rootDir: "."` adds a nesting level),
 * silently landing one directory short. Walking up to a known anchor is
 * correct from both locations without needing to know which one
 * `__dirname` is.
 *
 * Returns null instead of throwing when no anchor is found — a
 * production image built from `dist/` alone (no monorepo source, no
 * docker-compose.yml) is a real, expected deployment shape, and callers
 * must degrade gracefully rather than crash looking for a dev-only file
 * that was never supposed to ship.
 */
export function findRepoRoot(startDir: string): string | null {
  let dir = startDir;
  while (!existsSync(join(dir, "docker-compose.yml"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
  return dir;
}
