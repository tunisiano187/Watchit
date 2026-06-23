import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, isAdmin: users.isAdmin, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.createdAt));

  return NextResponse.json(rows);
}
