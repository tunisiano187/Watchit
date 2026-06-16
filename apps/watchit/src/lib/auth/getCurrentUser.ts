import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

/** Returns the signed-in user's full DB row, or null if there's no session. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  return user ?? null;
}
