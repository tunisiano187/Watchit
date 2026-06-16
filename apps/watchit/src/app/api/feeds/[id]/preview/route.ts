import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { feeds } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { fetchArticlesForFeed } from '@/lib/search/articleFetcher';

const PREVIEW_COUNT = 5;

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [feed] = await db
    .select()
    .from(feeds)
    .where(and(eq(feeds.id, params.id), eq(feeds.userId, user.id)));
  if (!feed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const articles = await fetchArticlesForFeed(feed, feed.topic);
  return NextResponse.json(articles.slice(0, PREVIEW_COUNT));
}
