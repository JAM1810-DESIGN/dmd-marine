const resendApiKey = process.env.RESEND_API_KEY;
const mailFrom = process.env.MAIL_FROM;

/** True once RESEND_API_KEY and MAIL_FROM are set — callers can save without sending until then. */
export const isMailConfigured = Boolean(resendApiKey && mailFrom);

export type SendResult = { sent: boolean; error?: string };

/** Sends a plain-text email via Resend. Returns {sent:false} (not throwing) when unconfigured. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  if (!isMailConfigured) {
    return { sent: false, error: "Email is not configured (set RESEND_API_KEY and MAIL_FROM)." };
  }

  try {
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

    if (!response.ok) {
      return { sent: false, error: `Email send failed (${response.status}).` };
    }
    return { sent: true };
  } catch {
    return { sent: false, error: "Couldn't reach the email service." };
  }
}
