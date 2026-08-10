import type { StorybookConfig } from "@storybook/angular-vite";

import { dirname } from "path";

import { fileURLToPath } from "url";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  // Serves the app's real public/ dir (i18n JSON, Vazirmatn font) so
  // stories load the same translation resources and fonts as production,
  // not story-local stand-ins.
  staticDirs: ["../public"],
  addons: [getAbsolutePath("@storybook/addon-a11y"), getAbsolutePath("@storybook/addon-docs")],
  framework: {
    name: getAbsolutePath("@storybook/angular-vite"),
    options: {
      // We don't use the Compodoc-generated docs.json (auto-populated prop
      // tables) — @storybook/addon-docs still renders a docs page from
      // TS types alone. Compodoc defaults to true and would otherwise
      // spawn a project-wide TS scan via a package we don't install.
      compodoc: false,
    },
  },
  // @dentix/kernel is a linked npm workspace package, not a real
  // published dependency, so Vite serves its compiled CommonJS output
  // straight off disk via /@fs/ instead of running it through esbuild's
  // dep-optimizer — and only that optimizer step does the CJS->ESM named-
  // export synthesis a browser-native `import { x } from ...` needs.
  // Forcing it into optimizeDeps makes named imports from kernel work the
  // same way they already do for every real npm dependency.
  async viteFinal(config) {
    config.optimizeDeps = {
      ...config.optimizeDeps,
      include: [...(config.optimizeDeps?.include ?? []), "@dentix/kernel"],
    };
    return config;
  },
};
export default config;
