import type { Env } from '../env';

// No-ops when MSG91 isn't configured — callers (routes/auth.ts) check
// env.MSG91_AUTH_KEY themselves and return the OTP directly in the API
// response as a dev-mode fallback instead of calling this at all. Once real
// MSG91 credentials are set via `wrangler secret put`, this starts actually
// sending SMS with no other code change needed.
export async function sendOtpSms(env: Env, phone: string, code: string): Promise<void> {
  if (!env.MSG91_AUTH_KEY) return;

  const res = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: env.MSG91_AUTH_KEY },
    body: JSON.stringify({
      template_id: env.MSG91_TEMPLATE_ID,
      mobile: phone,
      otp: code,
      sender: env.MSG91_SENDER_ID,
    }),
  });

  if (!res.ok) {
    throw new Error(`MSG91 send failed: ${res.status} ${await res.text()}`);
  }
}
