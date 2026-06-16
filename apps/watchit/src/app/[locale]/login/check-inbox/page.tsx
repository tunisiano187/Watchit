import { getTranslations } from 'next-intl/server';

export default async function CheckInboxPage() {
  const t = await getTranslations('Auth');

  return (
    <main style={{ maxWidth: 360, margin: '120px auto', textAlign: 'center' }}>
      <p>{t('checkInbox')}</p>
    </main>
  );
}
