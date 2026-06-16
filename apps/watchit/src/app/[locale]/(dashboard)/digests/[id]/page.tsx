import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { articles, digestArticles, digests, feeds } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { notFound } from 'next/navigation';

export default async function DigestDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const [digest] = await db.select().from(digests).where(eq(digests.id, params.id));
  if (!digest) notFound();

  const [feed] = await db.select().from(feeds).where(eq(feeds.id, digest.feedId));
  if (!feed || feed.userId !== user.id) notFound();

  const rows = await db
    .select({ article: articles, position: digestArticles.position })
    .from(digestArticles)
    .innerJoin(articles, eq(digestArticles.articleId, articles.id))
    .where(eq(digestArticles.digestId, digest.id))
    .orderBy(asc(digestArticles.position));

  return (
    <main>
      <h1>{feed.name}</h1>
      <p style={{ color: '#777' }}>
        {digest.status} — {digest.sentAt?.toISOString() ?? digest.createdAt.toISOString()}
      </p>
      <ol>
        {rows.map(({ article }) => (
          <li key={article.id}>
            <a href={article.url} target="_blank" rel="noreferrer">
              {article.title}
            </a>
          </li>
        ))}
      </ol>
    </main>
  );
}
