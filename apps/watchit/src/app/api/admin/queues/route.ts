import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { digestQueue, preferenceQueue, cleanupQueue } from '@/lib/queue/jobs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const queues = [digestQueue, preferenceQueue, cleanupQueue];
  const stats = await Promise.all(
    queues.map(async (q) => {
      const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      return { name: q.name, ...counts };
    }),
  );
  return NextResponse.json(stats);
}
