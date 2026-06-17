import { getTranslations } from 'next-intl/server';
import { signIn } from '@/auth';

export default async function LoginPage() {
  const t = await getTranslations('Auth');

  async function sendLink(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '');
    await signIn('resend', { email, redirectTo: '/dashboard' });
  }

  return (
    <main style={{ maxWidth: 360, margin: '120px auto', textAlign: 'center' }}>
      <form action={sendLink}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: 8 }}>
          {t('emailLabel')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12, padding: 8 }}
        />
        <button type="submit" style={{ width: '100%', padding: 8 }}>
          {t('sendLink')}
        </button>
      </form>
    </main>
  );
}
