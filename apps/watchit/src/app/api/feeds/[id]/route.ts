import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { feeds } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

const updateFeedSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  topic: z.string().min(1).max(200).optional(),
  active: z.boolean().optional(),
  articlesPerDigest: z.number().int().min(1).max(50).optional(),
});

async function getOwnedFeed(userId: string, feedId: string) {
  const [feed] = await db
    .select()
    .from(feeds)
    .where(and(eq(feeds.id, feedId), eq(feeds.userId, userId)));
  return feed ?? null;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feed = await getOwnedFeed(user.id, params.id);
  if (!feed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(feed);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feed = await getOwnedFeed(user.id, params.id);
  if (!feed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = updateFeedSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(feeds)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(feeds.id, feed.id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feed = await getOwnedFeed(user.id, params.id);
  if (!feed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.update(feeds).set({ active: false, updatedAt: new Date() }).where(eq(feeds.id, feed.id));
  return new NextResponse(null, { status: 204 });
}
