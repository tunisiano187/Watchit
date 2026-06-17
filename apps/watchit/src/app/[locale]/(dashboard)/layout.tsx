import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { Link } from '@/i18n/navigation';
import { signOut } from '@/auth';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) redirect({ href: '/login', locale });

  const t = await getTranslations('Nav');
  const currentUser = user!;

  return (
    <div>
      <nav
        style={{
          display: 'flex',
          gap: 16,
          padding: '12px 24px',
          borderBottom: '1px solid #e5e5e5',
          alignItems: 'center',
        }}
      >
        <Link href="/dashboard">{t('dashboard')}</Link>
        <Link href="/feeds">{t('feeds')}</Link>
        <Link href="/preferences">{t('preferences')}</Link>
        <Link href="/history">{t('history')}</Link>
        <Link href="/settings">{t('settings')}</Link>
        {currentUser.isAdmin && <Link href="/admin">{t('admin')}</Link>}
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
          style={{ marginLeft: 'auto' }}
        >
          <button type="submit">{t('signOut')}</button>
        </form>
      </nav>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}
