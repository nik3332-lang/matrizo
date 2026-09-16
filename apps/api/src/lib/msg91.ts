import type { Env } from "../env";

export function smsConfigured(env: Env): boolean {
  return Boolean(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID);
}

export async function sendOtpSms(
  env: Env,
  phone: string,
  code: string,
): Promise<void> {
  if (!smsConfigured(env)) throw new Error("SMS is unavailable");
  // MSG91 SendOTP accepts an application-generated code and an approved template.
  // Never log the URL, provider response, or fetch errors: they may contain codes.
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.search = new URLSearchParams({
    template_id: env.MSG91_TEMPLATE_ID!,
    mobile: `91${phone}`,
    otp: code,
    otp_expiry: "5",
    otp_length: "6",
  }).toString();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: env.MSG91_AUTH_KEY!,
    },
    body: "{}",
    signal: AbortSignal.timeout(10_000),
  });
  const result = (await response.json().catch(() => null)) as {
    type?: string;
  } | null;
  if (!response.ok || result?.type !== "success")
    throw new Error("SMS delivery failed");
}
