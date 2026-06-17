# Contributing a translation

Watchit's interface text lives in `apps/watchit/messages/*.json`. `en.json` is
the source of truth; every other locale file must have the exact same keys.

## Adding a new language

1. Copy `apps/watchit/messages/template.json` to `apps/watchit/messages/<locale>.json`,
   using the [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes)
   two-letter code (e.g. `es.json`, `de.json`).
2. Fill in every value. Keep placeholders and punctuation consistent with `en.json`.
3. Register the locale in `apps/watchit/src/i18n/locales.ts`:
   - add the code to the `locales` array
   - add a human-readable label to `localeLabels`
4. Open a pull request. A maintainer will sanity-check the translation before merging.

Note: the interface language (`locales.ts`) is separate from the *content
language* filter in user settings, which controls which languages articles
are fetched in. New interface translations don't require any change to
content-language filtering.
