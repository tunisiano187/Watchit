import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/lib/db/client';
import { feeds } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { redirect } from '@/i18n/navigation';

export default async function NewFeedPage() {
  const t = await getTranslations('Feeds');

  async function createFeed(formData: FormData) {
    'use server';
    const user = await getCurrentUser();
    if (!user) return;

    const name = String(formData.get('name') ?? '').trim();
    const topic = String(formData.get('topic') ?? '').trim();
    if (!name || !topic) return;

    const [feed] = await db.insert(feeds).values({ userId: user.id, name, topic }).returning();
    const locale = await getLocale();
    redirect({ href: `/feeds/${feed.id}`, locale });
  }

  return (
    <main>
      <h1>{t('newFeed')}</h1>
      <form action={createFeed} style={{ maxWidth: 400 }}>
        <label htmlFor="name" style={{ display: 'block', marginBottom: 4 }}>
          {t('name')}
        </label>
        <input id="name" name="name" required style={{ width: '100%', marginBottom: 12, padding: 8 }} />

        <label htmlFor="topic" style={{ display: 'block', marginBottom: 4 }}>
          {t('topic')}
        </label>
        <input id="topic" name="topic" required style={{ width: '100%', marginBottom: 12, padding: 8 }} />

        <button type="submit">{t('create')}</button>
      </form>
    </main>
  );
}
