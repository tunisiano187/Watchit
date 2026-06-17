import { db } from '@/lib/db/client';
import { articles, interactions, topicPreferences } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const SIGNAL_WEIGHTS: Record<string, number> = {
  click: 0.1,
  like: 0.4,
  dislike: -0.4,
};

// A comment means the user took the time to elaborate - treat it as a
// stronger signal than a bare click/like/dislike, regardless of the type
// (the type already carries the sign).
const COMMENT_BOOST = 1.25;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Updates topic_preferences for the user who produced this interaction,
 * based on the topics of the article they interacted with.
 */
export async function applyInteractionToScores(interactionId: string): Promise<void> {
  const [interaction] = await db
    .select()
    .from(interactions)
    .where(eq(interactions.id, interactionId));
  if (!interaction) return;

  const [article] = await db.select().from(articles).where(eq(articles.id, interaction.articleId));
  if (!article) return;

  const baseWeight = SIGNAL_WEIGHTS[interaction.type];
  if (baseWeight === undefined) return;

  const signalStrength = interaction.comment ? baseWeight * COMMENT_BOOST : baseWeight;
  const rawTopics = article.rawTopics ?? {};

  for (const [topic, topicWeight] of Object.entries(rawTopics)) {
    await upsertTopicScore(interaction.userId, topic, signalStrength * topicWeight);
  }
}

async function upsertTopicScore(userId: string, topic: string, delta: number): Promise<void> {
  const [existing] = await db
    .select()
    .from(topicPreferences)
    .where(sql`${topicPreferences.userId} = ${userId} AND ${topicPreferences.topic} = ${topic}`);

  if (!existing) {
    await db.insert(topicPreferences).values({
      userId,
      topic,
      score: clamp(delta, -1, 1),
      signalCount: 1,
      lastUpdated: new Date(),
    });
    return;
  }

  const learningRate = 1 / (1 + Math.log(1 + existing.signalCount));
  const newScore = clamp(existing.score + delta * learningRate, -1, 1);

  await db
    .update(topicPreferences)
    .set({
      score: newScore,
      signalCount: existing.signalCount + 1,
      lastUpdated: new Date(),
    })
    .where(
      sql`${topicPreferences.userId} = ${userId} AND ${topicPreferences.topic} = ${topic}`,
    );
}

/** Weekly decay job: pulls stale topic scores back toward neutral. */
export async function decayStaleScores(): Promise<void> {
  await db
    .update(topicPreferences)
    .set({ score: sql`${topicPreferences.score} * 0.95` })
    .where(sql`${topicPreferences.lastUpdated} < now() - interval '7 days'`);
}
