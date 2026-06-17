import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { feeds } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

const createFeedSchema = z.object({
  name: z.string().min(1).max(120),
  topic: z.string().min(1).max(200),
  focusMode: z.string().optional(),
  articlesPerDigest: z.number().int().min(1).max(50).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userFeeds = await db.select().from(feeds).where(eq(feeds.userId, user.id));
  return NextResponse.json(userFeeds);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = createFeedSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const [feed] = await db
    .insert(feeds)
    .values({
      userId: user.id,
      name: body.data.name,
      topic: body.data.topic,
      focusMode: body.data.focusMode ?? 'webSearch',
      articlesPerDigest: body.data.articlesPerDigest ?? 10,
    })
    .returning();

  return NextResponse.json(feed, { status: 201 });
}
