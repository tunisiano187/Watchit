import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/locales';

export default createMiddleware({
  locales,
  defaultLocale,
});

export const config = {
  // Skip API routes, tracking links, and static assets - those are
  // locale-independent or handle their own locale resolution.
  matcher: ['/((?!api|t|_next|favicon.ico).*)'],
};
