import { getTranslations } from 'next-intl/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { articles, digests, feeds } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { fetchArticlesForFeed } from '@/lib/search/articleFetcher';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';

export default async function FeedDetailPage({ params }: { params: { id: string } }) {
  const t = await getTranslations('Feeds');
  const user = await getCurrentUser();
  if (!user) notFound();

  const [feed] = await db
    .select()
    .from(feeds)
    .where(and(eq(feeds.id, params.id), eq(feeds.userId, user.id)));
  if (!feed) notFound();

  const feedArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.feedId, feed.id))
    .orderBy(desc(articles.fetchedAt))
    .limit(20);

  const feedDigests = await db
    .select()
    .from(digests)
    .where(eq(digests.feedId, feed.id))
    .orderBy(desc(digests.createdAt))
    .limit(10);

  async function runPreview() {
    'use server';
    await fetchArticlesForFeed(feed, feed.topic);
  }

  async function toggleActive() {
    'use server';
    await db.update(feeds).set({ active: !feed.active, updatedAt: new Date() }).where(eq(feeds.id, feed.id));
  }

  return (
    <main>
      <h1>{feed.name}</h1>
      <p>{feed.topic}</p>

      <form action={runPreview} style={{ display: 'inline-block', marginRight: 8 }}>
        <button type="submit">{t('preview')}</button>
      </form>
      <form action={toggleActive} style={{ display: 'inline-block' }}>
        <button type="submit">{feed.active ? t('inactive') : t('active')}</button>
      </form>

      <h2>Articles</h2>
      <ul>
        {feedArticles.map((article) => (
          <li key={article.id}>
            <a href={article.url} target="_blank" rel="noreferrer">
              {article.title}
            </a>{' '}
            {article.language && `(${article.language})`}
          </li>
        ))}
      </ul>

      <h2>Digests</h2>
      <ul>
        {feedDigests.map((digest) => (
          <li key={digest.id}>
            <Link href={`/digests/${digest.id}`}>
              {digest.createdAt.toISOString()} — {digest.status}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
