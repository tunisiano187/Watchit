import { NextResponse } from 'next/server';
import { enqueueDigest } from '@/lib/queue/jobs';

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  const key = request.headers.get('x-internal-api-key');
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await enqueueDigest(params.feedId);
  return NextResponse.json({ enqueued: true });
}
