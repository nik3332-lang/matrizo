import type { Env } from "../env";

export function emailConfigured(env: Env): boolean {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}

export async function sendResetEmail(
  env: Env,
  email: string,
  code: string,
  challengeId: string,
): Promise<void> {
  if (!emailConfigured(env)) throw new Error("Email recovery is unavailable");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `password-reset/${challengeId}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      subject: "Your Matrizo password reset code",
      text: `Matrizo\n\nYour password reset code is ${code}.\n\nEnter this code on the Matrizo password recovery page within 5 minutes. Never share it with anyone.\n\nIf you didn't request a password reset, you can ignore this email. Your password has not changed.\n\nMatrizo — Great spaces. Delivered.`,
      html: `<!doctype html><html><body style="margin:0;background:#f3f6f7;font-family:Arial,sans-serif;color:#18394b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0"><tr><td style="background:#18394b;color:#fff;padding:28px 32px;font-size:28px;font-weight:bold;letter-spacing:2px">MATRIZO</td></tr><tr><td style="padding:32px"><h1 style="font-size:24px;font-weight:500">A fresh start.</h1><p style="font-size:15px;line-height:1.7">Use this code on the Matrizo password recovery page to set a new password.</p><p style="padding:22px;background:#edf4f7;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;border-radius:8px">${code}</p><p style="font-size:14px;line-height:1.7">Your code expires in <strong>5 minutes</strong>. Never share it with anyone.</p><p style="font-size:12px;line-height:1.7;color:#627a87">If you didn’t request this, you can ignore this email. Your password has not changed.</p></td></tr><tr><td style="padding:20px 32px;border-top:1px solid #edf1f3;font-size:12px;color:#627a87">Great spaces. Delivered. · matrizo.com</td></tr></table></td></tr></table></body></html>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = (await response.json().catch(() => null)) as {
    id?: string;
  } | null;
  // Keep provider responses and email contents out of logs and client errors.
  if (!response.ok || !result?.id)
    throw new Error("Recovery email delivery failed");
}
