import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export interface DigestJobData {
  feedId: string;
}

export interface PreferenceUpdateJobData {
  interactionId: string;
}

export const digestQueue = new Queue<DigestJobData>('digest', { connection: redisConnection });
export const preferenceQueue = new Queue<PreferenceUpdateJobData>('preference-update', {
  connection: redisConnection,
});
export const cleanupQueue = new Queue('cleanup', { connection: redisConnection });

export async function enqueueDigest(feedId: string) {
  await digestQueue.add('send-digest', { feedId });
}

export async function enqueuePreferenceUpdate(interactionId: string) {
  await preferenceQueue.add('update-preference', { interactionId });
}
