import { getTranslations } from 'next-intl/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { articles, interactions } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

const TYPE_KEY: Record<string, 'click' | 'like' | 'dislike'> = {
  click: 'click',
  like: 'like',
  dislike: 'dislike',
};

export default async function HistoryPage() {
  const t = await getTranslations('History');
  const user = await getCurrentUser();

  const rows = user
    ? await db
        .select({ interaction: interactions, article: articles })
        .from(interactions)
        .innerJoin(articles, eq(interactions.articleId, articles.id))
        .where(eq(interactions.userId, user.id))
        .orderBy(desc(interactions.createdAt))
        .limit(100)
    : [];

  return (
    <main>
      <h1>{t('title')}</h1>
      <ul>
        {rows.map(({ interaction, article }) => (
          <li key={interaction.id}>
            {t(TYPE_KEY[interaction.type] ?? 'click')} — {article.title}
            {interaction.comment && <em> — "{interaction.comment}"</em>}
          </li>
        ))}
      </ul>
    </main>
  );
}
