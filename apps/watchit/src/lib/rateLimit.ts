import { redisConnection } from '@/lib/queue/redis';

/**
 * Sliding-window rate limiter backed by Redis.
 * Returns true if the request is within the allowed limit, false if it should be blocked.
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSecs: number,
): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  const count = await redisConnection.incr(key);
  if (count === 1) await redisConnection.expire(key, windowSecs);
  return count <= limit;
}
