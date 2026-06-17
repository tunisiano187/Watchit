import { getTranslations } from 'next-intl/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { feeds } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { Link } from '@/i18n/navigation';

export default async function FeedsPage() {
  const t = await getTranslations('Feeds');
  const user = await getCurrentUser();
  const userFeeds = user ? await db.select().from(feeds).where(eq(feeds.userId, user.id)) : [];

  return (
    <main>
      <h1>{t('title')}</h1>
      <Link href="/feeds/new">{t('newFeed')}</Link>
      <ul>
        {userFeeds.map((feed) => (
          <li key={feed.id}>
            <Link href={`/feeds/${feed.id}`}>{feed.name}</Link> — {feed.topic} —{' '}
            {feed.active ? t('active') : t('inactive')}
          </li>
        ))}
      </ul>
    </main>
  );
}
