import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { feeds } from '@/lib/db/schema';
import { enqueueDigest } from '@/lib/queue/jobs';

export async function POST(request: Request) {
  const key = request.headers.get('x-internal-api-key');
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activeFeeds = await db.select({ id: feeds.id }).from(feeds).where(eq(feeds.active, true));
  await Promise.all(activeFeeds.map((feed) => enqueueDigest(feed.id)));

  return NextResponse.json({ enqueued: activeFeeds.length });
}
