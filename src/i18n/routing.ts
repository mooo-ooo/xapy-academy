import { defineRouting } from "next-intl/routing";
import { LOCALES } from "./locales";

/**
 * `locales` is auto-derived from `messages/*.json` via
 * `tools/sync-locales.ts` (run at predev/prebuild). Edit messages/*.json
 * files, then restart dev — locales.ts regenerates on the next predev.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
