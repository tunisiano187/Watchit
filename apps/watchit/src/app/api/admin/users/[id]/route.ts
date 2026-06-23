import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (params.id === currentUser.id) {
    return NextResponse.json({ error: 'Cannot change your own admin status' }, { status: 400 });
  }

  const { isAdmin } = (await req.json()) as { isAdmin: boolean };
  await db.update(users).set({ isAdmin, updatedAt: new Date() }).where(eq(users.id, params.id));
  return NextResponse.json({ ok: true });
}
