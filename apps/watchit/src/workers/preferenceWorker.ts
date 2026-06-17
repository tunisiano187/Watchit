import { Worker } from 'bullmq';
import { redisConnection } from '@/lib/queue/redis';
import { type PreferenceUpdateJobData } from '@/lib/queue/jobs';
import { applyInteractionToScores } from '@/lib/preferences/scorer';

export function startPreferenceWorker(): Worker<PreferenceUpdateJobData> {
  return new Worker<PreferenceUpdateJobData>(
    'preference-update',
    async (job) => {
      await applyInteractionToScores(job.data.interactionId);
    },
    { connection: redisConnection },
  );
}
