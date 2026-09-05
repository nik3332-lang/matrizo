import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Default config: no incremental cache / KV wiring yet (this is a fully
// static site so far — no ISR/revalidation to cache). Revisit once
// apps/web has dynamic, cacheable routes.
export default defineCloudflareConfig();
