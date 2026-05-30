import type en from "../messages/en.json";

/**
 * next-intl type augmentation. `messages/en.json` is the canonical key set,
 * so `t('a.b.c')` autocompletes/type-checks against it even though VALUES
 * are overridden at runtime from the DB. `Locale` is widened to `string`
 * because the active set is dynamic (admin-added locales).
 */
declare module "next-intl" {
  interface AppConfig {
    Messages: typeof en;
    Locale: string;
  }
}
