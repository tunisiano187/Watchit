import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';

const CATALOGS: Record<string, typeof en> = { en, fr };

/**
 * Loads the full message catalog for a locale outside of a Next.js request
 * context (route handlers under /t, which sit outside the [locale]
 * segment). Falls back to English for unknown locales.
 */
export function getRawMessages(locale: string) {
  return CATALOGS[locale] ?? CATALOGS.en;
}
