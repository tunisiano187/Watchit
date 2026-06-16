import { getRawMessages } from '@/lib/i18n/getRawMessages';

/** Minimal ICU-lite interpolation: replaces {key} with values[key]. */
function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

/**
 * Loads the "Email" message namespace for a locale, outside of any Next.js
 * request context (used by the worker process).
 */
export function getEmailMessages(locale: string) {
  const { Email } = getRawMessages(locale);

  return {
    subject: (values: { feedName: string }) => format(Email.subject, values),
    intro: (values: { feedName: string }) => format(Email.intro, values),
    readMore: Email.readMore,
    likeLabel: Email.likeLabel,
    dislikeLabel: Email.dislikeLabel,
  };
}
