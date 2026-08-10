export function generateOtp(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Salted with the phone number so the same OTP digits never hash the same
// across different phone numbers.
export async function hashOtp(otp: string, phone: string): Promise<string> {
  const data = new TextEncoder().encode(`${phone}:${otp}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}
