import { db } from '@/lib/db/client';
import { articles, type feeds } from '@/lib/db/schema';
import { searchVane } from './vaneClient';
import { detectLanguage } from '@/lib/lang/detect';
import { extractTopics } from '@/lib/topics/extractor';
import { redisConnection } from '@/lib/queue/redis';

const SEEN_URLS_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

type Feed = typeof feeds.$inferSelect;

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Runs the feed's search against Vane, deduplicates against previously seen
 * URLs (Redis set, then a DB unique constraint as a second line of defense),
 * tags language and topics, and persists new articles.
 *
 * Returns the newly inserted articles for this run (already-seen articles
 * are skipped, not returned).
 */
export async function fetchArticlesForFeed(feed: Feed, query: string) {
  const seenKey = `feed:${feed.id}:seen_urls`;
  const result = await searchVane(query);

  const newArticles: (typeof articles.$inferInsert)[] = [];

  for (const source of result.sources) {
    const { url, title } = source.metadata;
    if (!url || !title) continue;

    const alreadySeen = await redisConnection.sismember(seenKey, url);
    if (alreadySeen) continue;

    const summary = source.content?.slice(0, 2000) ?? null;
    const textForAnalysis = `${title}\n${summary ?? ''}`;
    const language = detectLanguage(textForAnalysis);
    const rawTopics = await extractTopics(textForAnalysis);
    const topics = Object.entries(rawTopics)
      .filter(([, weight]) => weight >= 0.3)
      .map(([topic]) => topic);

    newArticles.push({
      feedId: feed.id,
      url,
      title,
      summary,
      sourceDomain: extractDomain(url),
      language,
      publishedAt: source.metadata.publishedDate ? new Date(source.metadata.publishedDate) : null,
      topics,
      rawTopics,
    });

    await redisConnection.sadd(seenKey, url);
  }

  await redisConnection.expire(seenKey, SEEN_URLS_TTL_SECONDS);

  if (newArticles.length === 0) return [];

  const inserted = await db
    .insert(articles)
    .values(newArticles)
    .onConflictDoNothing({ target: [articles.feedId, articles.url] })
    .returning();

  return inserted;
}
