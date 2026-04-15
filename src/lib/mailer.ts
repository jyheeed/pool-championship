import nodemailer from 'nodemailer';

type ApprovalEmailInput = {
  email: string;
  name: string;
  club?: string;
  city?: string;
};

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendRegistrationApprovalEmail(input: ApprovalEmailInput): Promise<boolean> {
  if (!hasSmtpConfig()) {
    console.warn('SMTP is not configured. Skipping registration approval email.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  const subject = 'Registration approved - Tunisian Pool Championship';
  const text = [
    `Hello ${input.name},`,
    '',
    'Your registration has been approved by the admin team.',
    input.club ? `Club: ${input.club}` : null,
    input.city ? `City: ${input.city}` : null,
    '',
    `Follow the championship updates here: ${appUrl}`,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin:0 0 16px">Registration approved</h2>
      <p>Hello <strong>${input.name}</strong>,</p>
      <p>Your registration for the Tunisian Pool Championship has been approved.</p>
      <ul>
        ${input.club ? `<li><strong>Club:</strong> ${input.club}</li>` : ''}
        ${input.city ? `<li><strong>City:</strong> ${input.city}</li>` : ''}
      </ul>
      <p>Track the event here: <a href="${appUrl}">${appUrl}</a></p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from,
      to: input.email,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('Failed to send registration approval email', error);
    return false;
  }
}