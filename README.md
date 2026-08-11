# Matrizo

Home-improvement marketplace (paints, sanitary & plumbing, hardware) — rebuilt as a real e-commerce
product across web, iOS, and Android from **one Expo Router codebase**, backed by a **Cloudflare
Workers** API.

Modeled on [home-run.co](https://home-run.co): category browsing, bulk-pricing tiers, pincode
serviceability, OTP login, pay-on-delivery + online payments, native apps.

## Structure

```
apps/app/       Expo Router app — compiles to web, iOS, and Android from one codebase
workers/api/    Cloudflare Worker (Hono) — the REST API, backed by D1/R2/KV
packages/shared/ Shared zod schemas, types, and API client used by both of the above
```

## Stack

- **App**: Expo + Expo Router + NativeWind (Tailwind for React Native), exported to web via
  `react-native-web`, built to native binaries via EAS.
- **API**: Cloudflare Workers + [Hono](https://hono.dev), **D1** (SQL, via Drizzle ORM) for
  relational data, **R2** for product images, **KV** for OTP/session/cache, **Queues** for async
  jobs (OTP dispatch, notifications).
- **Auth**: phone + OTP via MSG91 (the one non-Cloudflare dependency for login).
- **Payments**: Razorpay for online payment, alongside pay-on-delivery (the other non-Cloudflare
  dependency — Cloudflare has no payments product).

See `.claude/plans/valiant-petting-fairy.md` (if present) or ask for the current phased build plan.

## Prerequisites

- Node.js 20+ (Expo SDK 57 requires Node 22.13+; this repo uses Node 24)
- [pnpm](https://pnpm.io) (`corepack enable` or `npm i -g pnpm`)
- A Cloudflare account + `npx wrangler login` (only needed once you deploy or touch real D1/KV/R2)

Install everything from the repo root:

```sh
pnpm install
```

> This repo pins `nodeLinker: hoisted` in `pnpm-workspace.yaml`. React Native's Metro bundler
> doesn't reliably resolve pnpm's default strict/symlinked `node_modules` layout (packages like
> nativewind end up with unresolvable nested deps such as `react-native-css-interop`) — hoisting
> keeps a flat, npm-like `node_modules` across the whole workspace.

## Running the app (web / iOS / Android)

```sh
pnpm app:web       # opens in the browser (Metro dev server)
pnpm app:ios       # requires macOS + Xcode, or use Expo Go
pnpm app:android   # requires Android Studio / an emulator, or use Expo Go
pnpm app:dev        # Metro dev server, pick a platform from the CLI
```

To produce a static web build (what gets deployed to Cloudflare Pages):

```sh
pnpm app:build:web
# output in apps/app/dist/
```

To deploy it straight to Cloudflare Pages (project `matrizo`, `apps/app/wrangler.jsonc`):

```sh
pnpm app:deploy:web
```

> First time only: the Pages project must exist before this will push to it —
> `cd apps/app && npx wrangler pages project create matrizo`.

## Running the API

```sh
pnpm api:dev
```

This runs `wrangler dev`, which emulates D1/KV/R2 **locally** under `apps/api/.wrangler/state` —
no Cloudflare login needed for local development. Verify it's up:

```sh
curl http://127.0.0.1:8787/api/v1/health
```

### First-time real Cloudflare resources (only needed before a real deploy)

`workers/api/wrangler.jsonc` currently has placeholder IDs for D1/KV. Before deploying for real:

```sh
cd workers/api
npx wrangler login
npx wrangler d1 create matrizo-db
npx wrangler kv namespace create matrizo-cache
npx wrangler r2 bucket create matrizo-assets
# then paste the returned ids into wrangler.jsonc
```

Secrets (MSG91 API key, JWT signing secret, Razorpay keys — added in later phases) are set with
`npx wrangler secret put <NAME>`, never committed to the repo.

### Database migrations (Drizzle → D1)

Schema lives in `workers/api/src/db/schema.ts` (empty for now — Phase 1 adds the catalog tables).

```sh
pnpm api:db:generate         # generate a migration from schema.ts changes
pnpm api:db:migrate:local    # apply migrations to the local D1 emulation
```

## Status

This is a phased rebuild of what was previously a static coming-soon page. That page
(`index.html` at the repo root) has been removed — the Expo web export (`pnpm app:build:web`,
deployed via `pnpm app:deploy:web`) is now the thing that gets served. See the build plan for
what's done and what's next — catalog, OTP auth, cart, checkout, and orders are wired up; native
store submission and payment gateway go-live follow in later phases.
