import { existsSync } from "fs";
import { dirname, join } from "path";

/**
 * Walks up from `startDir` to find the monorepo root, identified by
 * `docker-compose.yml` (a real, stable, root-only file). A fixed hop
 * count would be correct from ts-node (running against source, e.g.
 * `apps/worker/src/...`) but wrong from the compiled build
 * (`apps/worker/dist/...`), silently landing one directory short (or, for
 * assets that live outside this package entirely, landing in the wrong
 * package). Walking up to a known anchor is correct from both locations
 * without needing to know which one `__dirname` is.
 *
 * Duplicated from apps/api/src/platform/find-repo-root.ts rather than
 * shared via @dentix/kernel: this is a Node-`fs` utility, and kernel's
 * audience explicitly includes the browser bundle (apps/web imports it) —
 * a filesystem-walking helper doesn't belong in a package meant to be
 * safe to import from a browser context.
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
