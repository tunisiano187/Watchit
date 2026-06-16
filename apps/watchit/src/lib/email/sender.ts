import { Resend } from 'resend';
import { render } from '@react-email/render';
import * as React from 'react';
import { DigestEmail, type DigestEmailProps } from './templates/DigestEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'onboarding@resend.dev';

export async function sendDigestEmail(to: string, subject: string, props: DigestEmailProps): Promise<void> {
  const html = await render(React.createElement(DigestEmail, props));

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send digest email: ${error.message}`);
  }
}
