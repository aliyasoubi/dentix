#!/usr/bin/env node
/**
 * Fails when user-facing text is written into a component instead of a
 * translation resource (ADR-012 / UX-DS-001 §2.1).
 *
 * Review was the only thing enforcing this, and review missed two real
 * cases: a `placeholder="09xxxxxxxxx"` sitting in a template, and Material's
 * English datepicker aria-labels. The second is why the attribute check
 * matters as much as the text-node check — a11y strings are user-facing text
 * that never looks like copy.
 *
 * Three checks, in the order they catch things:
 *  1. Persian/Arabic script anywhere outside the i18n resources.
 *  2. User-facing attributes given a literal instead of a binding.
 *  3. Literal text nodes in templates.
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

/**
 * Specs and stories are developer-facing fixtures, never shipped UI.
 *
 * index.html is the pre-boot document shell: its <title> renders before the
 * bundle (and therefore the translate pipe) exists, so it cannot be bound.
 * It is not an exemption from translation — app.config.ts re-sets the title
 * from the resources once they load, so the static copy is only a
 * before-hydration fallback.
 */
const EXCLUDED = /(\.(spec|stories)\.ts|index\.html)$/;

/** Arabic, plus the presentation-forms blocks Persian text can normalize into. */
const PERSIAN = /[؀-ۿﭐ-﷿ﹰ-﻿]/;
/** Attributes whose value a user reads or hears. `alt` only when non-empty — alt="" is the correct way to mark an image decorative. */
const TEXT_ATTRIBUTES = /\s(placeholder|aria-label|title|alt)="([^"]*)"/g;

const failures = [];

function record(file, line, message, snippet) {
  failures.push({ file: relative(ROOT, file), line, message, snippet });
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

/** Strips comments so an explanatory comment mentioning a Persian word is not a finding. */
function stripComments(source, isHtml) {
  if (isHtml) {
    return source.replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));
  }
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length));
}

/**
 * Reduces a template to just its text nodes: everything a user would read
 * that did not come from an interpolation.
 */
function textNodesOf(html) {
  return (
    html
      // Order matters. Tags go first so attribute values (which contain both
      // braces and quotes) can never be mistaken for text. Interpolations go
      // before control flow, because stripping `}` first would eat the `}}`
      // that terminates them and leave the expression behind as "text".
      .replace(/<[^>]*>/g, " ")
      .replace(/\{\{[\s\S]*?\}\}/g, " ")
      .replace(/@[a-z]+[^{]*\{/g, " ")
      .replace(/\}/g, " ")
  );
}

const files = globSync("**/*.{ts,html}", { cwd: SRC })
  .filter((f) => !EXCLUDED.test(f))
  .map((f) => join(SRC, f));

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const isHtml = file.endsWith(".html");
  const source = stripComments(raw, isHtml);

  // 1. Persian/Arabic script outside translation resources.
  const persian = source.match(PERSIAN);
  if (persian) {
    const index = source.indexOf(persian[0]);
    record(
      file,
      lineOf(source, index),
      "Persian text in a component — move it to public/i18n/fa-IR/*.json and read it through the translate pipe",
      source.split("\n")[lineOf(source, index) - 1]?.trim().slice(0, 100) ?? "",
    );
  }

  // 2. User-facing attributes with a literal value.
  for (const match of source.matchAll(TEXT_ATTRIBUTES)) {
    const [full, name, value] = match;
    if (value.trim() === "") continue; // alt="" marks a decorative image
    record(
      file,
      lineOf(source, match.index),
      `${name} is user-facing text — bind it ([${name}]="'key' | translate") instead of hardcoding`,
      full.trim(),
    );
  }

  // 3. Literal text nodes. Templates only — an inline `template:` in a .ts
  //    file is covered by the Persian check above, and parsing TS string
  //    literals for prose would flag every import path.
  if (isHtml) {
    for (const [index, chunk] of [...textNodesOf(source).matchAll(/[^\s][^\n]*/g)].map((m) => [
      m.index,
      m[0],
    ])) {
      const text = String(chunk).trim();
      // Two or more letters in a row is prose; single characters and
      // punctuation left over from stripping are not.
      if (/[A-Za-z]{2,}/.test(text)) {
        record(
          file,
          lineOf(source, Number(index)),
          "literal text in a template — move it to a translation resource",
          text.slice(0, 100),
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`\nHardcoded UI text (${failures.length}):\n`);
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line}\n    ${f.message}\n    > ${f.snippet}\n`);
  }
  process.exit(1);
}

console.log(`lint:i18n — no hardcoded UI text (${files.length} files checked).`);
