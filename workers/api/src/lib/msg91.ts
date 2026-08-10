import type { Env } from '../env';

export function isMsg91Configured(env: Env): boolean {
  return Boolean(env.MSG91_AUTH_KEY && env.MSG91_SENDER_ID && env.MSG91_TEMPLATE_ID);
}

// NOTE: MSG91's exact request shape depends on the DLT-approved template
// configured on the account (India's telecom regulation requires SMS
// templates to be pre-registered). This targets MSG91's OTP API v5 — adjust
// the payload to match the real template once MSG91_TEMPLATE_ID is set.
export async function sendOtpSms(env: Env, phone: string, otp: string): Promise<void> {
  if (!isMsg91Configured(env)) {
    throw new Error('MSG91 is not configured');
  }

  const res = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: env.MSG91_AUTH_KEY!,
    },
    body: JSON.stringify({
      template_id: env.MSG91_TEMPLATE_ID,
      mobile: `91${phone}`,
      sender: env.MSG91_SENDER_ID,
      otp,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MSG91 OTP send failed (${res.status}): ${body}`);
  }
}
