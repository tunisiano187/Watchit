import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { getServiceLogs } from '@/lib/docker/services';

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const tail = Number(req.nextUrl.searchParams.get('tail') ?? '200');
  try {
    const logs = await getServiceLogs(params.name, Math.min(tail, 1000));
    return new NextResponse(logs, { headers: { 'content-type': 'text/plain' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
