/**
 * Scans `messages/*.json` and rewrites `src/i18n/locales.ts` so that
 * `routing.locales` is auto-derived from whatever locale files exist
 * on disk. Runs at `predev` + `prebuild`.
 *
 * Idempotent — no-op when the on-disk locales already match.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MESSAGES_DIR = join(ROOT, "messages");
const LOCALES_FILE = join(ROOT, "src", "i18n", "locales.ts");

function discoverLocales(): string[] {
  const files = readdirSync(MESSAGES_DIR);
  const codes = files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
  // English is always first — it's the routing default + fallback locale.
  return [
    "en",
    ...codes.filter((c) => c !== "en").sort((a, b) => a.localeCompare(b)),
  ].filter((c, i, arr) => arr.indexOf(c) === i);
}

function renderLocalesFile(locales: string[]): string {
  const codes = locales.map((c) => `"${c}"`).join(", ");
  return `/**
 * AUTO-GENERATED — do not edit by hand.
 *
 * Owned by \`tools/sync-locales.ts\`, which scans \`messages/*.json\` and
 * regenerates this file. It runs automatically via the \`predev\` and
 * \`prebuild\` scripts in package.json.
 *
 * \`en\` is always first (it's the default fallback).
 */

export const LOCALES = [${codes}] as const;

export type LocaleCode = (typeof LOCALES)[number];
`;
}

function main() {
  const locales = discoverLocales();
  const next = renderLocalesFile(locales);
  let prev = "";
  try {
    prev = readFileSync(LOCALES_FILE, "utf-8");
  } catch {
    // First run — file doesn't exist yet.
  }
  if (prev === next) {
    console.log(`[sync-locales] up-to-date (${locales.join(", ")})`);
    return;
  }
  writeFileSync(LOCALES_FILE, next, "utf-8");
  console.log(
    `[sync-locales] wrote ${locales.length} locales: ${locales.join(", ")}`,
  );
}

main();
