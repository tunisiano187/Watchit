import { getTranslations } from 'next-intl/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { feeds } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { Link } from '@/i18n/navigation';

export default async function DashboardPage() {
  const t = await getTranslations('Dashboard');
  const user = await getCurrentUser();
  const userFeeds = user ? await db.select().from(feeds).where(eq(feeds.userId, user.id)) : [];

  return (
    <main>
      <h1>{t('title')}</h1>
      {userFeeds.length === 0 ? (
        <div>
          <p>{t('noFeeds')}</p>
          <Link href="/feeds/new">{t('createFeed')}</Link>
        </div>
      ) : (
        <ul>
          {userFeeds.map((feed) => (
            <li key={feed.id}>
              <Link href={`/feeds/${feed.id}`}>{feed.name}</Link> — {feed.topic}{' '}
              {feed.active ? '✅' : '⏸️'}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
