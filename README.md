# Matrizo

Quick-commerce delivery for construction materials (cement, hardware, plumbing, electrical
supplies) — a dark-store model, similar in shape to Blinkit/Zepto but for a building-materials
catalog. Backed by **Cloudflare Workers**, with separate **Next.js** apps for the customer site
and the dark-store ops portal. A React Native (Expo) mobile app follows once web + API + admin
are working end-to-end.

## Structure

```
apps/api/       Cloudflare Worker (Hono) — the REST API, backed by D1, with a Durable Object
                per active order for live tracking. R2/KV/Queues bindings land as each is used.
apps/web/       Next.js — customer site (browse catalog, cart, checkout), Cloudflare Pages
apps/admin/     Next.js — dark-store ops portal (order queue, inventory), Cloudflare Pages
packages/shared/ Shared zod schemas, enums, and pricing logic used by all of the above
```

`apps/mobile/` (Expo) isn't scaffolded yet — deliberately deferred until the web + API + admin
flows are solid.

## Stack

- **API**: Cloudflare Workers + [Hono](https://hono.dev), **D1** (SQLite, via Drizzle ORM) for
  relational data, a **Durable Object** (`OrderTrackerDO`, one per active order) for live
  WebSocket order tracking, **R2** for product images and delivery-proof photos, **KV** for
  catalog cache / pincode serviceability / anonymous cart sessions, **Queues** for async jobs
  (dispatch, cashback, notifications).
- **Web / Admin**: Next.js on Cloudflare Pages — separate apps rather than route groups of one
  app, since the ops portal has different auth/permissions and no reason to ship React Native
  web bundles to a back-office user.
- **Auth**: phone + OTP (via MSG91) for customers, email + password for store staff / delivery
  partners / admins — one custom-JWT scheme with a `role` claim, extending what the pre-rewrite
  MVP already had rather than adopting Clerk/Supabase (see reasoning in the schema-design PR).
- **Payments**: Razorpay (UPI) alongside cash-on-delivery.

## Data model

Core entities (see `apps/api/src/db/schema.ts` for the authoritative definitions):

- `users` — role-based (`customer` / `store_staff` / `delivery_partner` / `admin`)
- `stores` + `store_service_pincodes` — dark stores and which pincodes each one serves
- `products` + `categories` + `bulk_pricing_tiers` — catalog, with volume-discount tiers
- `inventory` — per-store stock levels
- `orders` + `order_items` — assigned to exactly one store at creation time
- `order_status_events` — append-only tracking history (`orders.status` is just the current
  pointer); the `OrderTrackerDO` reads/writes through this table and only caches the latest
  status in memory for fast WebSocket fan-out
- `delivery_assignments` — links an order to the delivery partner fulfilling it
- `wallet_transactions` — append-only cashback/wallet ledger

## Prerequisites

- Node.js 20+ (this repo uses Node 24)
- [pnpm](https://pnpm.io) (`corepack enable` or `npm i -g pnpm`)
- A Cloudflare account + `npx wrangler login` (only needed once you deploy or touch real D1/KV/R2)

Install everything from the repo root:

```sh
pnpm install
```

> `pnpm-workspace.yaml` pins `nodeLinker: hoisted`, kept from before the rewrite in anticipation
> of `apps/mobile` (Expo) returning — React Native's Metro bundler doesn't reliably resolve
> pnpm's default strict/symlinked `node_modules` layout.

## Running things

```sh
pnpm api:dev      # wrangler dev — emulates D1/KV/DO locally, no Cloudflare login needed
pnpm web:dev       # Next.js dev server, customer site
pnpm admin:dev     # Next.js dev server, ops portal
```

Verify the API's up:

```sh
curl http://127.0.0.1:8787/api/v1/health
```

### Database migrations (Drizzle → D1)

Schema lives in `apps/api/src/db/schema.ts`.

```sh
pnpm api:db:generate         # generate a migration from schema.ts changes
pnpm api:db:migrate:local    # apply migrations to the local D1 emulation
pnpm api:db:migrate:remote   # apply migrations to the real D1 database (needs wrangler login)
```

### Deploying apps/web (Cloudflare Pages → Workers migration in progress)

`www.matrizo.com` is live today on a **Cloudflare Pages** project (git-integrated: pushing to
`main` auto-deploys), built with `@cloudflare/next-on-pages`. That adapter works by internally
running `vercel build` as a build-time step — no Vercel account/hosting involved, but it's an
extra dependency, and the package is deprecated upstream in favor of a fully-Cloudflare toolchain.

We're migrating to `@opennextjs/cloudflare`, which deploys `apps/web` as a **Workers** project
instead (no Vercel involved at any point). Both paths coexist for now:

```sh
pnpm --filter @matrizo/web run pages:build   # old path — what the live Pages project still runs
pnpm --filter @matrizo/web run deploy        # new path — builds + `wrangler deploy`s a Workers
                                              # project named matrizo-web (run manually for now)
```

Once `matrizo-web` (the Worker) is verified working, the remaining step is cutting
`www.matrizo.com` over to it and retiring the Pages project + `next-on-pages` — a deliberate,
separate step, not automatic.

### Real Cloudflare resources

`apps/api/wrangler.jsonc` points at real, already-provisioned resources (account:
`Nikhilsinghal.official@gmail.com`'s account): D1 database `matrizo-db` and KV namespace `CACHE`.
R2 and Queues bindings are commented out in `wrangler.jsonc` until each is actually enabled/created
on the account (R2 needs a one-time dashboard opt-in; both need `wrangler r2 bucket create` /
`wrangler queues create` before their binding can be uncommented, or `wrangler deploy` fails
referencing a resource that doesn't exist).

Secrets (MSG91 API key, JWT signing secret, Razorpay keys) are set with
`npx wrangler secret put <NAME>` from `apps/api`, never committed to the repo.

## Status

Rewritten from a single-store home-improvement-marketplace MVP (Expo Router app + a simpler
Workers API — see git history before this rewrite) into the dark-store quick-commerce model
described above. Current state: monorepo scaffolding, full D1 schema, and migrations are in place
(applied to both local and the real remote D1). API routes (catalog + serviceability, cart +
order creation, the order-tracking Durable Object), the admin order queue / inventory screens, and
the customer catalog/cart/checkout flow are the next build steps, in that order.
