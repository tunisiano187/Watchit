import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/locales';
import type { ReactNode } from 'react';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as (typeof locales)[number])) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  const umamiId  = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL ?? '';

  return (
    <html lang={locale}>
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        {umamiId && (
          <Script
            src={`${umamiUrl}/script.js`}
            data-website-id={umamiId}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
