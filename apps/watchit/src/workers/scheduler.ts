import { Queue, Worker } from 'bullmq';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { digests, feeds, users } from '@/lib/db/schema';
import { redisConnection } from '@/lib/queue/redis';
import { enqueueDigest } from '@/lib/queue/jobs';
import { getHourInTimezone } from '@/lib/time/timezoneHour';

const CHECK_INTERVAL_CRON = '0 * * * *'; // every hour, on the hour
// A feed shouldn't receive two digests within this window, even if the
// scheduler runs more than once during the user's delivery hour.
const MIN_HOURS_BETWEEN_DIGESTS = 20;

async function wasDigestSentRecently(feedId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - MIN_HOURS_BETWEEN_DIGESTS * 60 * 60 * 1000);
  const [recent] = await db
    .select()
    .from(digests)
    .where(and(eq(digests.feedId, feedId), gte(digests.createdAt, cutoff)));
  return Boolean(recent);
}

async function checkDueFeeds(): Promise<void> {
  const now = new Date();

  const dueFeeds = await db
    .select({ feed: feeds, user: users })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id))
    .where(eq(feeds.active, true));

  for (const { feed, user } of dueFeeds) {
    const localHour = getHourInTimezone(now, user.timezone);
    if (localHour !== user.digestHour) continue;
    if (await wasDigestSentRecently(feed.id)) continue;

    await enqueueDigest(feed.id);
  }
}

const schedulerQueue = new Queue('scheduler', { connection: redisConnection });

export async function registerScheduler(): Promise<void> {
  await schedulerQueue.add(
    'check-due-feeds',
    {},
    { repeat: { pattern: CHECK_INTERVAL_CRON }, jobId: 'check-due-feeds' },
  );
}

export function startSchedulerWorker(): Worker {
  return new Worker(
    'scheduler',
    async () => {
      await checkDueFeeds();
    },
    { connection: redisConnection },
  );
}
