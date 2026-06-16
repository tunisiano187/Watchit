import { randomBytes } from 'crypto';
import { db } from '@/lib/db/client';
import { trackingTokens } from '@/lib/db/schema';

const TOKEN_TTL_DAYS = 7;
const ACTIONS = ['click', 'like', 'dislike'] as const;
export type TrackingAction = (typeof ACTIONS)[number];

const TRACKING_BASE_URL = process.env.TRACKING_BASE_URL ?? 'http://localhost:3000';

export interface ArticleTrackingLinks {
  click: string;
  like: string;
  dislike: string;
}

/** Generates one token per action for an article and persists them, returning ready-to-use URLs. */
export async function generateTrackingLinks(
  userId: string,
  articleId: string,
  digestId: string,
): Promise<ArticleTrackingLinks> {
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const rows = ACTIONS.map((action) => ({
    token: randomBytes(16).toString('hex'),
    userId,
    articleId,
    digestId,
    action,
    expiresAt,
  }));

  await db.insert(trackingTokens).values(rows);

  return {
    click: `${TRACKING_BASE_URL}/t/${rows[0].token}`,
    like: `${TRACKING_BASE_URL}/t/${rows[1].token}`,
    dislike: `${TRACKING_BASE_URL}/t/${rows[2].token}`,
  };
}
