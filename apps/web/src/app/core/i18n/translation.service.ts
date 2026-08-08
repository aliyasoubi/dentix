import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";

/**
 * UX-DS-001 §2.1: "All static user-interface text must be loaded from
 * translation resource files. Angular templates and TypeScript components
 * must not hardcode user-facing Persian prose." One fixed locale (fa-IR,
 * ADR-012) — no runtime language switch, so this only ever loads one set
 * of resources, never re-loads on a locale change.
 */
@Injectable({ providedIn: "root" })
export class TranslationService {
  private readonly http = inject(HttpClient);
  private readonly entries = signal<Record<string, string>>({});

  async loadNamespaces(namespaces: readonly string[]): Promise<void> {
    const chunks = await Promise.all(
      namespaces.map((namespace) =>
        firstValueFrom(this.http.get<Record<string, string>>(`/i18n/fa-IR/${namespace}.json`)),
      ),
    );
    this.entries.set(Object.assign({}, ...chunks) as Record<string, string>);
  }

  /** Parameterized messages only — never build a sentence by concatenating translated fragments. */
  translate(key: string, params?: Readonly<Record<string, string>>): string {
    const template = this.entries()[key] ?? key;
    if (!params) {
      return template;
    }
    return Object.entries(params).reduce(
      (message, [name, value]) => message.replaceAll(`{{${name}}}`, value),
      template,
    );
  }
}
