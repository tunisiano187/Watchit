import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function LandingPage() {
  const t = await getTranslations('Landing');

  return (
    <main style={{ maxWidth: 480, margin: '120px auto', textAlign: 'center' }}>
      <h1>{t('title')}</h1>
      <p style={{ color: '#555' }}>{t('subtitle')}</p>
      <Link href="/login" style={{ display: 'inline-block', marginTop: 16 }}>
        {t('signIn')}
      </Link>
    </main>
  );
}
