import { Queue, Worker } from 'bullmq';
import { lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { trackingTokens } from '@/lib/db/schema';
import { redisConnection } from '@/lib/queue/redis';
import { decayStaleScores } from '@/lib/preferences/scorer';
import { cleanupQueue } from '@/lib/queue/jobs';

async function cleanupExpiredTokens(): Promise<void> {
  await db.delete(trackingTokens).where(lt(trackingTokens.expiresAt, new Date()));
}

export async function registerCleanupJobs(): Promise<void> {
  await cleanupQueue.add(
    'cleanup-tokens',
    {},
    { repeat: { pattern: '0 4 * * *' }, jobId: 'cleanup-tokens' }, // daily at 04:00 UTC
  );
  await cleanupQueue.add(
    'decay-scores',
    {},
    { repeat: { pattern: '0 3 * * 1' }, jobId: 'decay-scores' }, // weekly, Monday 03:00 UTC
  );
}

export function startCleanupWorker(): Worker {
  return new Worker(
    'cleanup',
    async (job) => {
      if (job.name === 'cleanup-tokens') await cleanupExpiredTokens();
      if (job.name === 'decay-scores') await decayStaleScores();
    },
    { connection: redisConnection },
  );
}
