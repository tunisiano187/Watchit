import { NextResponse } from 'next/server';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { digests, feeds } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userFeeds = await db.select({ id: feeds.id }).from(feeds).where(eq(feeds.userId, user.id));
  if (userFeeds.length === 0) return NextResponse.json([]);

  const feedIds = userFeeds.map((f) => f.id);
  const userDigests = await db
    .select()
    .from(digests)
    .where(inArray(digests.feedId, feedIds))
    .orderBy(desc(digests.createdAt))
    .limit(50);

  return NextResponse.json(userDigests);
}
