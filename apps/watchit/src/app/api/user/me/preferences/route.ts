import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { db } from '@/lib/db/client';
import { topicPreferences } from '@/lib/db/schema';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const preferences = await db
    .select()
    .from(topicPreferences)
    .where(eq(topicPreferences.userId, user.id))
    .orderBy(desc(topicPreferences.score));

  return NextResponse.json(preferences);
}
