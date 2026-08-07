import { readFileSync, readdirSync, statSync } from "fs";
import { dirname, join, relative } from "path";

/**
 * ADR-006: "CI fails if an entity file exists that is not explicitly
 * registered." dependency-cruiser's rule model can express "every X must
 * import Y" but not "Y must import every X" — this is the second half of
 * that pair, checked with a plain static scan instead of forcing the
 * dependency graph to express something it isn't shaped for.
 */
const SRC_DIR = join(__dirname, "..", "src");
const ENTITIES_FILE = join(SRC_DIR, "persistence", "entity-registry.ts");

function findOrmEntityFiles(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      found.push(...findOrmEntityFiles(full));
    } else if (name.endsWith(".orm-entity.ts")) {
      found.push(full);
    }
  }
  return found;
}

const entityFiles = findOrmEntityFiles(join(SRC_DIR, "modules"));
const entitiesSource = readFileSync(ENTITIES_FILE, "utf8");

const unregistered = entityFiles.filter((file) => {
  const specifier = relative(dirname(ENTITIES_FILE), file)
    .replace(/\\/g, "/")
    .replace(/\.ts$/, "");
  const importSpecifier = specifier.startsWith(".") ? specifier : `./${specifier}`;
  return !entitiesSource.includes(importSpecifier);
});

if (unregistered.length > 0) {
  console.error("lint:arch — entity file(s) exist but are not registered in src/persistence/entity-registry.ts:");
  for (const file of unregistered) {
    console.error(`  - ${relative(SRC_DIR, file)}`);
  }
  process.exit(1);
}

console.log(
  `lint:arch — entity registration OK (${entityFiles.length} entit${entityFiles.length === 1 ? "y" : "ies"} registered).`,
);
