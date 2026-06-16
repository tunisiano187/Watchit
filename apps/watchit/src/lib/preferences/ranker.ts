import { db } from '@/lib/db/client';
import { topicPreferences, type articles, type feeds } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type Article = typeof articles.$inferSelect;
type Feed = typeof feeds.$inferSelect;
type TopicPreference = typeof topicPreferences.$inferSelect;

const RECENCY_HALF_LIFE_HOURS = 72;

export async function getTopicPreferences(userId: string): Promise<TopicPreference[]> {
  return db.select().from(topicPreferences).where(eq(topicPreferences.userId, userId));
}

/** Higher is better. Combines topic relevance (weighted by user preference) and recency. */
export function scoreArticleForUser(article: Article, preferences: TopicPreference[]): number {
  const prefMap = new Map(preferences.map((p) => [p.topic, p.score]));
  const rawTopics = article.rawTopics ?? {};

  let relevanceScore = 0;
  let totalWeight = 0;
  for (const [topic, topicWeight] of Object.entries(rawTopics)) {
    const userScore = prefMap.get(topic) ?? 0;
    relevanceScore += topicWeight * (1 + userScore);
    totalWeight += topicWeight;
  }
  const normalizedRelevance = totalWeight > 0 ? relevanceScore / totalWeight : 1;

  const publishedAt = article.publishedAt ?? article.fetchedAt;
  const ageHours = (Date.now() - publishedAt.getTime()) / 3_600_000;
  const recencyBonus = Math.exp(-ageHours / RECENCY_HALF_LIFE_HOURS);

  return normalizedRelevance * 0.7 + recencyBonus * 0.3;
}

/** Filters candidates by the user's content-language preference, then ranks by score. */
export function rankArticlesForUser(
  candidates: Article[],
  preferences: TopicPreference[],
  preferredContentLanguages: string[],
  limit: number,
): Article[] {
  const filtered =
    preferredContentLanguages.length === 0
      ? candidates
      : candidates.filter((a) => a.language && preferredContentLanguages.includes(a.language));

  return [...filtered]
    .sort((a, b) => scoreArticleForUser(b, preferences) - scoreArticleForUser(a, preferences))
    .slice(0, limit);
}

const BOOST_THRESHOLD = { score: 0.3, signalCount: 2 };
const BLOCK_THRESHOLD = { score: -0.5, signalCount: 3 };

/** Appends positively-scored topics and excludes strongly negative ones from the base query. */
export function buildAugmentedQuery(feed: Feed, preferences: TopicPreference[]): string {
  const boostTopics = preferences
    .filter((p) => p.score > BOOST_THRESHOLD.score && p.signalCount >= BOOST_THRESHOLD.signalCount)
    .slice(0, 3)
    .map((p) => p.topic);

  const blockTopics = preferences
    .filter((p) => p.score < BLOCK_THRESHOLD.score && p.signalCount >= BLOCK_THRESHOLD.signalCount)
    .slice(0, 2)
    .map((p) => `-"${p.topic}"`);

  return [feed.topic, ...boostTopics, ...blockTopics].join(' ');
}
