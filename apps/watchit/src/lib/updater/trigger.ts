import { redisConnection } from '@/lib/queue/redis';

const UPDATE_QUEUE = 'watchit:update:queue';
const UPDATE_STATUS_KEY = 'watchit:update:status';

export async function triggerUpdate(): Promise<void> {
  await redisConnection.lpush(UPDATE_QUEUE, Date.now().toString());
}

export type UpdateState = 'idle' | 'running' | 'success' | 'error';

export async function getUpdateStatus(): Promise<{ state: UpdateState; message: string; updatedAt: string | null }> {
  const raw = await redisConnection.get(UPDATE_STATUS_KEY);
  if (!raw) return { state: 'idle', message: '', updatedAt: null };
  try {
    return JSON.parse(raw);
  } catch {
    return { state: 'idle', message: '', updatedAt: null };
  }
}
