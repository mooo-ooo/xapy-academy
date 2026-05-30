import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import en from "../../messages/en.json";

type Tree = Record<string, unknown>;

function isObj(v: unknown): v is Tree {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Deep-merge `override` on top of `base`. Used so messages in any locale
 * file silently fall back to the English value when a key is missing —
 * keeps the scaffolded locale files (es/fr/de/…) functional even when
 * they drift behind en.json after we add new UI keys.
 */
function deepMerge(base: Tree, override: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const b = out[k];
    out[k] = isObj(v) && isObj(b) ? deepMerge(b, v) : v;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const target =
    locale === "en"
      ? en
      : ((await import(`../../messages/${locale}.json`)).default as Tree);
  return {
    locale,
    messages: deepMerge(en as Tree, target),
  };
});
