import { getTokenCommentContext, addCommentToInteraction } from '@/lib/tracking/recordInteraction';
import { getRawMessages } from '@/lib/i18n/getRawMessages';
import { notFound } from 'next/navigation';

export default async function CommentPage({ params }: { params: { token: string } }) {
  const context = await getTokenCommentContext(params.token);
  if (!context) notFound();

  const { Tracking } = getRawMessages(context.interfaceLocale);

  async function submitComment(formData: FormData) {
    'use server';
    const comment = String(formData.get('comment') ?? '').trim();
    if (comment) {
      await addCommentToInteraction(context!.interactionId, comment);
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <p style={{ fontSize: 18 }}>{Tracking.addComment}</p>
      <form action={submitComment}>
        <textarea
          name="comment"
          placeholder={Tracking.commentPlaceholder}
          rows={4}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
        />
        <button type="submit">{Tracking.submit}</button>
      </form>
    </main>
  );
}
