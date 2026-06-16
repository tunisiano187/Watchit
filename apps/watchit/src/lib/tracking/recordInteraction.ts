import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { articles, interactions, trackingTokens, users } from '@/lib/db/schema';
import { enqueuePreferenceUpdate } from '@/lib/queue/jobs';

export interface ResolvedToken {
  articleUrl: string;
  action: 'click' | 'like' | 'dislike';
  interactionId: string;
  interfaceLocale: string;
}

/**
 * Validates a tracking token, records the interaction (idempotently - a
 * token can only be consumed once), and queues a preference-score update.
 * Returns null if the token is missing, expired, or already used.
 */
export async function resolveTrackingToken(token: string): Promise<ResolvedToken | null> {
  const [row] = await db
    .select({ token: trackingTokens, interfaceLocale: users.interfaceLocale })
    .from(trackingTokens)
    .innerJoin(users, eq(trackingTokens.userId, users.id))
    .where(eq(trackingTokens.token, token));
  if (!row) return null;
  if (row.token.usedAt) return null;
  if (row.token.expiresAt < new Date()) return null;

  const [article] = await db.select().from(articles).where(eq(articles.id, row.token.articleId));
  if (!article) return null;

  const [interaction] = await db
    .insert(interactions)
    .values({
      userId: row.token.userId,
      articleId: row.token.articleId,
      digestId: row.token.digestId,
      type: row.token.action,
    })
    .returning();

  await db
    .update(trackingTokens)
    .set({ usedAt: new Date(), interactionId: interaction.id })
    .where(eq(trackingTokens.token, token));
  await enqueuePreferenceUpdate(interaction.id);

  return {
    articleUrl: article.url,
    action: row.token.action as ResolvedToken['action'],
    interactionId: interaction.id,
    interfaceLocale: row.interfaceLocale,
  };
}

/** Attaches an optional free-text comment to an already-recorded interaction. */
export async function addCommentToInteraction(interactionId: string, comment: string): Promise<void> {
  await db.update(interactions).set({ comment }).where(eq(interactions.id, interactionId));
}

export interface TokenCommentContext {
  interactionId: string;
  action: 'click' | 'like' | 'dislike';
  interfaceLocale: string;
}

/** Looks up the interaction + user locale for a used token, for the comment follow-up page. */
export async function getTokenCommentContext(token: string): Promise<TokenCommentContext | null> {
  const [row] = await db
    .select({
      interactionId: trackingTokens.interactionId,
      action: trackingTokens.action,
      interfaceLocale: users.interfaceLocale,
    })
    .from(trackingTokens)
    .innerJoin(users, eq(trackingTokens.userId, users.id))
    .where(eq(trackingTokens.token, token));

  if (!row?.interactionId) return null;
  return {
    interactionId: row.interactionId,
    action: row.action as TokenCommentContext['action'],
    interfaceLocale: row.interfaceLocale,
  };
}
