import { inject, provideAppInitializer } from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { applicationConfig, type Preview } from "@storybook/angular-vite";
import { TranslationService } from "../src/app/core/i18n/translation.service";
import "../src/styles.scss";

// The real app's index.html sets these statically; Storybook's preview
// iframe has no index.html of ours, so set them once here — RTL/Farsi is
// the only locale (ADR-012), never toggled at runtime either place.
document.documentElement.setAttribute("lang", "fa-IR");
document.documentElement.setAttribute("dir", "rtl");

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
  decorators: [
    applicationConfig({
      providers: [
        provideHttpClient(),
        provideAnimationsAsync(),
        // Same real translation.service.ts + real /i18n/fa-IR/*.json
        // (served via main.ts's staticDirs) as the production app —
        // stories render actual product copy, not story-local stand-ins.
        provideAppInitializer(() => inject(TranslationService).loadNamespaces(["common"])),
      ],
    }),
  ],
};

export default preview;
