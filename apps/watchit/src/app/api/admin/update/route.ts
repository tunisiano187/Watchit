import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { checkForUpdates } from '@/lib/updater/checker';
import { triggerUpdate, getUpdateStatus } from '@/lib/updater/trigger';

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const [versionStatus, updateStatus] = await Promise.all([checkForUpdates(), getUpdateStatus()]);
  return NextResponse.json({ ...versionStatus, updateStatus });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await triggerUpdate();
  return NextResponse.json({ ok: true });
}
