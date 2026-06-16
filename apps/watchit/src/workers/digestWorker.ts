import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { digestArticles, digests, feeds, users } from '@/lib/db/schema';
import { redisConnection } from '@/lib/queue/redis';
import { type DigestJobData } from '@/lib/queue/jobs';
import { fetchArticlesForFeed } from '@/lib/search/articleFetcher';
import { buildAugmentedQuery, getTopicPreferences, rankArticlesForUser } from '@/lib/preferences/ranker';
import { generateTrackingLinks } from '@/lib/email/tokenGenerator';
import { sendDigestEmail } from '@/lib/email/sender';
import { getEmailMessages } from '@/lib/email/messages';

async function runDigestJob(feedId: string): Promise<void> {
  const [feed] = await db.select().from(feeds).where(eq(feeds.id, feedId));
  if (!feed || !feed.active) return;

  const [user] = await db.select().from(users).where(eq(users.id, feed.userId));
  if (!user) return;

  const [digest] = await db.insert(digests).values({ feedId: feed.id, status: 'pending' }).returning();

  const preferences = await getTopicPreferences(user.id);
  const query = buildAugmentedQuery(feed, preferences);
  const fetched = await fetchArticlesForFeed(feed, query);

  const selected = rankArticlesForUser(
    fetched,
    preferences,
    user.preferredContentLanguages,
    feed.articlesPerDigest,
  );

  if (selected.length === 0) {
    await db.update(digests).set({ status: 'failed' }).where(eq(digests.id, digest.id));
    return;
  }

  await db.insert(digestArticles).values(
    selected.map((article, index) => ({
      digestId: digest.id,
      articleId: article.id,
      position: index,
    })),
  );

  const messages = getEmailMessages(user.interfaceLocale);
  const emailArticles = await Promise.all(
    selected.map(async (article) => {
      const links = await generateTrackingLinks(user.id, article.id, digest.id);
      return {
        title: article.title,
        sourceDomain: article.sourceDomain,
        clickUrl: links.click,
        likeUrl: links.like,
        dislikeUrl: links.dislike,
      };
    }),
  );

  await sendDigestEmail(user.email, messages.subject({ feedName: feed.name }), {
    feedName: feed.name,
    intro: messages.intro({ feedName: feed.name }),
    articles: emailArticles,
    likeLabel: messages.likeLabel,
    dislikeLabel: messages.dislikeLabel,
  });

  await db
    .update(digests)
    .set({
      status: 'sent',
      sentAt: new Date(),
      articleIds: selected.map((a) => a.id),
    })
    .where(eq(digests.id, digest.id));
}

export function startDigestWorker(): Worker<DigestJobData> {
  return new Worker<DigestJobData>(
    'digest',
    async (job) => {
      await runDigestJob(job.data.feedId);
    },
    { connection: redisConnection },
  );
}
