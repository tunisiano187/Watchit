import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';

const ALLOW_SIGNUP = process.env.ALLOW_SIGNUP === 'true';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.FROM_EMAIL ?? 'onboarding@resend.dev',
    }),
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/login/check-inbox',
  },
  session: { strategy: 'database' },
  callbacks: {
    async signIn({ user }) {
      if (ALLOW_SIGNUP || !user.email) return true;

      const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, user.email));
      return Boolean(existing) || user.email === process.env.ADMIN_EMAIL;
    },
  },
});
