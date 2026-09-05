// CloudflareBindings (worker-configuration.d.ts) only covers declared
// bindings (D1/KV/DO, and later R2/Queues once those are provisioned).
// Secrets and vars added via `wrangler secret put` / wrangler.jsonc `vars`
// aren't declared there, so they're typed here instead.
export type Env = CloudflareBindings & {
  JWT_SECRET?: string;
  MSG91_AUTH_KEY?: string;
  MSG91_SENDER_ID?: string;
  MSG91_TEMPLATE_ID?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
};
