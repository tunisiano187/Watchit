import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { listServices } from '@/lib/docker/services';

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const services = await listServices();
    return NextResponse.json(services);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
