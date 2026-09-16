# Matrizo

Matrizo brings sanitary ware, bathroom fittings, plumbing supplies, and paints into one local quick-commerce storefront, with separate operations and employee workspaces.

| Application | Address                                                       | Purpose                                                                              |
| ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Storefront  | https://www.matrizo.com                                       | Browse, search, filter, basket, cash-on-delivery checkout, order tracking            |
| Admin       | https://adminacc.matrizo.com                                  | Products, nested categories, inventory, orders, staff, employees, daily sales review |
| Employees   | https://emp.matrizo.com                                       | Daily sales reports, monthly totals, commission, profile                             |
| API         | https://matrizo-api.nikhilsinghal-official.workers.dev/api/v1 | Shared authenticated REST API                                                        |

## Architecture

- `apps/web`, `apps/admin`, `apps/employees`: Next.js 16, deployed as Cloudflare Workers through OpenNext.
- `apps/api`: Hono Worker with Drizzle, D1, KV, and an order-tracking Durable Object.
- `packages/shared`: domain types, pricing, API client, currency/date utilities, and portal styling.
- `apps/mobile`: existing Expo application; not part of the September 2026 website release.
- `tests`: isolated API integration tests with local D1/KV/Durable Objects.

## What works

Customers can browse the actual active catalog, search, filter by category/brand, inspect product details and quantity pricing, check delivery pincodes, create an email/password account, save addresses, order with cash on delivery, and track orders. New accounts include a delivery contact number. Uploaded product URLs take precedence over category illustrations.

Admins can create/edit/remove products and nested categories, manage inventory and orders, add/edit/remove/restore employees, and review daily sales by date or employee. Daily review includes submitted/missing reports, totals, estimated commission, notes, and CSV export. A removed employee loses access immediately; historic sales stay in the business records. Categories containing products or subcategories must be emptied before removal.

Employees can save or update one sales total per day, add notes, inspect their journal and monthly commission estimate, and maintain their profile. Sales dates follow India Standard Time. Reports are employee-entered totals, not automatically reconciled with online orders. Commission estimates use the employee's currently configured rate; they are not a payroll ledger.

## Local development

Use Node.js 24 and the pinned pnpm version. `pnpm install` installs the workspace.

For a completely isolated demo, run `pnpm test:serve`. This builds the API into an ephemeral Miniflare environment, applies the migrations locally, and creates demo products, a test store, an admin, and two employees. No root `.env` is loaded and no Cloudflare resources are changed.

In separate terminals:

```sh
NEXT_PUBLIC_API_URL=http://localhost:8787/api/v1 pnpm web:dev --port 3000
NEXT_PUBLIC_API_URL=http://localhost:8787/api/v1 pnpm admin:dev --port 3001
NEXT_PUBLIC_API_URL=http://localhost:8787/api/v1 pnpm employees:dev --port 3002
```

Local fixture accounts are `admin-test@matrizo.test` and `employee-test@matrizo.test`. The fixture-only password is `TEST_PASSWORD` in `scripts/local-platform.mjs`. Never create these accounts in production. For a separate storefront preview while another Next server is running, set `MATRIZO_NEXT_DIR=.next-preview` and choose another port.

The regular `pnpm api:dev` uses Wrangler's local persistence instead of the fixture. Initialize it with `pnpm api:db:migrate:local` and supply a local JWT secret through `apps/api/.dev.vars`. Never point local test runs at production D1.

## Verification

```sh
pnpm test
pnpm --filter @matrizo/api exec tsc --noEmit
pnpm --filter @matrizo/web exec tsc --noEmit
pnpm --filter @matrizo/admin exec tsc --noEmit
pnpm --filter @matrizo/employees exec tsc --noEmit
pnpm --filter @matrizo/web lint
pnpm --filter @matrizo/admin lint
pnpm --filter @matrizo/employees lint
pnpm --filter @matrizo/web worker:build
pnpm --filter @matrizo/admin worker:build
pnpm --filter @matrizo/employees worker:build
```

Integration tests cover catalog/nested-category CRUD, role boundaries, daily reporting, employee removal and restoration, customer login/refresh, cash-on-delivery inventory, cancellation, and competing checkouts for the final item. The test harness requires permission to start a local workerd process.

## Cloudflare configuration and deployment

The root `.env` is ignored by Git. It holds Cloudflare deployment access, not browser configuration. Never log it, bundle it into a website, or commit it. Worker runtime secrets are managed separately through Wrangler. The API requires `JWT_SECRET`; existing owner login also uses `OWNER_EMAIL` and `OWNER_PASSWORD`.

A safe, read-only configuration check prints resource names, domains, and secret **names**:

```sh
node --env-file=.env scripts/cloudflare-status.mjs
```

Each app has a `wrangler.jsonc` pointing at the existing Worker and bindings. After building and exporting the Cloudflare deployment credentials into the shell environment:

```sh
pnpm api:deploy
pnpm --filter @matrizo/web exec opennextjs-cloudflare deploy
pnpm --filter @matrizo/admin exec opennextjs-cloudflare deploy
pnpm --filter @matrizo/employees exec opennextjs-cloudflare deploy
```

Deploy API compatibility changes before the websites. `NEXT_PUBLIC_API_URL` is public and baked into the frontend at build time; production builds must use the production API URL. The storefront's `API` service binding handles server-side requests directly to the API Worker. This release does not change D1 schema or require a migration.

## Operational configuration still needed

- Cash on delivery is the checkout payment option. Razorpay keys and production payment/webhook integration are not configured.
- Email/password sign-in is available for new customer accounts. SMS sign-in stays disabled until MSG91 is configured, and OTP codes are never returned to the browser. Existing phone-only accounts need SMS service restored or a verified account-recovery process; there is no self-service password reset yet.
- Existing product data, product-specific images, store stock, and delivery coverage must be maintained by the business. Category illustrations and the bathroom hero are editorial imagery, not a guarantee of a particular SKU's appearance. The live sanitary category currently needs real products added by an admin.
- R2/Queues bindings remain disabled in the current infrastructure; product images use supplied URLs or bundled assets.

See [release notes and visual provenance](docs/release-2026-09-16.md) for implementation and validation details.
