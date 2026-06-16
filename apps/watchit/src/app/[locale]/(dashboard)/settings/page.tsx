import { getLocale, getTranslations } from 'next-intl/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { locales, localeLabels } from '@/i18n/locales';
import { SUPPORTED_CONTENT_LANGUAGES } from '@/lib/lang/supportedContentLanguages';
import { redirect } from '@/i18n/navigation';

export default async function SettingsPage() {
  const t = await getTranslations('Settings');
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect({ href: '/login', locale });
  const currentUserSettings = user!;

  async function saveSettings(formData: FormData) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) return;

    const timezone = String(formData.get('timezone') ?? currentUser.timezone);
    const digestHour = Number(formData.get('digestHour') ?? currentUser.digestHour);
    const interfaceLocale = String(formData.get('interfaceLocale') ?? currentUser.interfaceLocale);
    const preferredContentLanguages = formData.getAll('contentLanguages').map(String);

    await db
      .update(users)
      .set({ timezone, digestHour, interfaceLocale, preferredContentLanguages, updatedAt: new Date() })
      .where(eq(users.id, currentUser.id));
  }

  return (
    <main>
      <h1>{t('title')}</h1>
      <form action={saveSettings} style={{ maxWidth: 420 }}>
        <label htmlFor="timezone" style={{ display: 'block', marginBottom: 4 }}>
          {t('timezone')}
        </label>
        <input
          id="timezone"
          name="timezone"
          defaultValue={currentUserSettings.timezone}
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />

        <label htmlFor="digestHour" style={{ display: 'block', marginBottom: 4 }}>
          {t('digestHour')}
        </label>
        <input
          id="digestHour"
          name="digestHour"
          type="number"
          min={0}
          max={23}
          defaultValue={currentUserSettings.digestHour}
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />

        <label htmlFor="interfaceLocale" style={{ display: 'block', marginBottom: 4 }}>
          {t('interfaceLanguage')}
        </label>
        <select
          id="interfaceLocale"
          name="interfaceLocale"
          defaultValue={currentUserSettings.interfaceLocale}
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        >
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {localeLabels[locale]}
            </option>
          ))}
        </select>

        <label style={{ display: 'block', marginBottom: 4 }}>{t('contentLanguages')}</label>
        <p style={{ fontSize: 12, color: '#777', marginTop: 0 }}>{t('contentLanguagesHint')}</p>
        <div style={{ marginBottom: 12 }}>
          {SUPPORTED_CONTENT_LANGUAGES.map((lang) => (
            <label key={lang.code} style={{ display: 'block', fontSize: 14 }}>
              <input
                type="checkbox"
                name="contentLanguages"
                value={lang.code}
                defaultChecked={currentUserSettings.preferredContentLanguages.includes(lang.code)}
              />{' '}
              {lang.label}
            </label>
          ))}
        </div>

        <button type="submit">{t('save')}</button>
      </form>
    </main>
  );
}
