const resendApiKey = process.env.RESEND_API_KEY;
const mailFrom = process.env.MAIL_FROM;

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPass && mailFrom);
const resendConfigured = Boolean(resendApiKey && mailFrom);

/** True once an email transport (SMTP or Resend) plus a from-address are set. */
export const isMailConfigured = smtpConfigured || resendConfigured;

export type SendResult = { sent: boolean; error?: string };

async function sendViaSmtp(params: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const { default: nodemailer } = await import("nodemailer");
  const port = Number(smtpPort ?? 465);
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  await transport.sendMail({
    from: mailFrom,
    to: params.to,
    subject: params.subject,
    text: params.text,
    replyTo: params.replyTo,
  });
  return { sent: true };
}

async function sendViaResend(params: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });
  if (!response.ok) return { sent: false, error: `Email send failed (${response.status}).` };
  return { sent: true };
}

/** Sends a plain-text email via SMTP (preferred) or Resend. Returns {sent:false} when unconfigured. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  if (!isMailConfigured) {
    return {
      sent: false,
      error: "Email is not configured (set SMTP_* or RESEND_API_KEY, plus MAIL_FROM).",
    };
  }
  try {
    return smtpConfigured ? await sendViaSmtp(params) : await sendViaResend(params);
  } catch {
    return { sent: false, error: "Couldn't reach the email service." };
  }
}
