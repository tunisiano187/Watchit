import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { searchVane } from '@/lib/search/vaneClient';

const schema = z.object({ topic: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: 'Invalid topic' }, { status: 400 });

  const result = await searchVane(body.data.topic);

  const articles = result.sources.slice(0, 5).map((s) => ({
    title: s.metadata.title,
    url: s.metadata.url,
    publishedDate: s.metadata.publishedDate ?? null,
    summary: s.content?.slice(0, 300) ?? null,
  }));

  return NextResponse.json(articles);
}
