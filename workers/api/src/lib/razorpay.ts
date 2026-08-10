import type { Env } from '../env';

export function isRazorpayConfigured(env: Env): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

export async function createRazorpayOrder(
  env: Env,
  receiptId: string,
  amountInRupees: number
): Promise<string> {
  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount: Math.round(amountInRupees * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: receiptId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Razorpay order creation failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyRazorpayWebhookSignature(
  env: Env,
  rawBody: string,
  signature: string
): Promise<boolean> {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.RAZORPAY_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  return toHex(signatureBuffer) === signature;
}
