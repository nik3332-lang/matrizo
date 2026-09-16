# Matrizo mobile

Expo SDK 57 customer app for Android and iOS. Uses the existing Cloudflare API; the admin and employee portals remain web applications.

From the repository root:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test:serve
```

In a second terminal, start the app against the disposable local API:

```sh
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_URL=http://127.0.0.1:8787/api/v1 pnpm --filter @matrizo/mobile start
```

For a physical phone, use a reachable development API address (or a staging Worker). A phone’s `127.0.0.1` is the phone itself. Do not use production customer data for tests.

Run `pnpm --filter @matrizo/mobile typecheck` and `pnpm --filter @matrizo/mobile bundle:native` for local validation. Start Expo once to regenerate route types when adding routes; generated `.expo` files are ignored. `pnpm test` at the root exercises authentication/session races, checkout, account deletion and notification delivery with isolated databases and mocked providers.

The app supports mobile number/email + password sign-in, registration, email recovery when configured, browsing, search, serviceability, stock, bulk pricing, addresses, COD checkout, order progress/cancellation, optional push notifications, and account deletion. Authentication tokens use SecureStore on native devices. Push needs an installed development/release build, a linked Expo project, FCM/APNs credentials, and backend enablement. Expo Go is not a release test environment.

See [the release checklist](../../docs/mobile-release.md) for deployment order, environment variables, signing and store submission. Building bundles does not deploy the API or submit an app.
