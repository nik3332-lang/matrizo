import { getCloudflareContext } from '@opennextjs/cloudflare';

import { api } from './api';

// Minimal shape of a Cloudflare service binding — defined locally rather
// than pulling in @cloudflare/workers-types globally, which redefines
// web-standard globals (Request/Response/fetch) in ways that can clash
// with this app's `lib: ["dom", ...]` tsconfig.
type ServiceBinding = { fetch(input: string, init?: RequestInit): Promise<Response> };

declare global {
  interface CloudflareEnv {
    /** Service binding to matrizo-api — see wrangler.jsonc. */
    API?: ServiceBinding;
  }
}

// Server-only fetch for Server Components (product/[slug], category/
// [slug]) — routes through the `API` service binding to matrizo-api
// directly, a real Worker-to-Worker RPC that never touches the public
// network, instead of a fetch() to matrizo-api's workers.dev URL.
//
// That URL-based path hits Cloudflare error 1042 ("Worker to Worker
// request... not allowed") on requests between two *.workers.dev
// subdomains — confirmed live: product/category pages 500'd/showed "not
// found" consistently in production (retries included) until this
// existed. Client-side (browser) fetches via lib/api.ts are unaffected —
// a browser isn't a Worker, so they never hit this.
//
// Falls back to the regular URL-based client when no Cloudflare context
// is available (plain `next dev` without the platform proxy configured),
// so local development keeps working unchanged.
export async function serverApiGet<T>(path: string): Promise<T> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env.API) {
      const res = await env.API.fetch(`https://matrizo-api.internal/api/v1${path}`, { method: 'GET' });
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`);
      return body as T;
    }
  } catch {
    // No usable Cloudflare context — fall through to the URL-based client.
  }
  return api.get<T>(path);
}
