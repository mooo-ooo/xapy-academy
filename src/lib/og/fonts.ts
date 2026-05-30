import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Shared font loader for the `next/og` ImageResponse routes.
 *
 * Satori (the engine behind `next/og`) does NOT resolve `system-ui` and
 * cannot read woff2 — so Vietnamese diacritics rendered as tofu. We embed
 * a real static TTF that covers Latin + Vietnamese (Be Vietnam Pro, OFL).
 *
 * Read from disk via `fs` (both OG routes run on the nodejs runtime). The
 * `fetch(new URL(...))` asset pattern is NOT used because it throws during
 * static prerender under Turbopack. `next.config.ts` adds the font dir to
 * `outputFileTracingIncludes` so it ships in traced/standalone builds too.
 */
export type OgFont = {
  name: string;
  data: ArrayBuffer | Buffer;
  weight: 400 | 700;
  style: "normal";
};

export const OG_FONT_FAMILY = "Be Vietnam Pro";

const FONT_DIR = join(process.cwd(), "src", "lib", "og", "fonts");

let cached: OgFont[] | null = null;

export async function loadOgFonts(): Promise<OgFont[]> {
  if (cached) return cached;
  const [regular, bold] = await Promise.all([
    readFile(join(FONT_DIR, "BeVietnamPro-Regular.ttf")),
    readFile(join(FONT_DIR, "BeVietnamPro-Bold.ttf")),
  ]);
  cached = [
    { name: OG_FONT_FAMILY, data: regular, weight: 400, style: "normal" },
    { name: OG_FONT_FAMILY, data: bold, weight: 700, style: "normal" },
  ];
  return cached;
}
