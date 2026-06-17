import { NextRequest, NextResponse } from 'next/server';
import { resolveTrackingToken } from '@/lib/tracking/recordInteraction';
import { getRawMessages } from '@/lib/i18n/getRawMessages';

function notedPage(token: string, message: string, addCommentLabel: string, skipLabel: string) {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Watchit</title></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center;">
  <p style="font-size: 18px;">${message}</p>
  <a href="/t/${token}/comment" style="display:inline-block;margin:8px;color:#1a1a1a;">${addCommentLabel}</a>
</body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function expiredPage(message: string) {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Watchit</title></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center;">
  <p style="font-size: 18px;">${message}</p>
</body></html>`;
  return new NextResponse(html, { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const resolved = await resolveTrackingToken(params.token);

  if (!resolved) {
    const { Tracking } = getRawMessages('en');
    return expiredPage(Tracking.expired);
  }

  if (resolved.action === 'click') {
    return NextResponse.redirect(resolved.articleUrl);
  }

  const { Tracking } = getRawMessages(resolved.interfaceLocale);
  const message = resolved.action === 'like' ? Tracking.thanksLike : Tracking.thanksDislike;
  return notedPage(params.token, message, Tracking.addComment, Tracking.skip);
}
