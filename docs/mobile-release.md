# Matrizo Android and iOS release

## Feature update: 23 September 2026

Implemented in the working tree: configurable category colours with inherited category settings; supplied official logo and `Matrizo` wordmarks without a trailing dot; public availability without stock quantities; original paint shades grouped by family, with distinct cart variants and order snapshots; public painter/plumber listings and profiles on web and mobile; admin shade management; and employee profile/photo management restricted to `admin` and `sales_employee` on the API.

Apply migrations 0006, 0007 and 0008 after any unapplied earlier migrations, before deploying these API/client changes. 0006 configures colours for existing UPVC/CPVC/PVC category slugs. 0007 enables colour selection for the existing `paints` category, seeds original Matrizo shades, and changes cart uniqueness to customer/product/shade. New categories are configured through the category editor. Existing uncoloured paint cart lines must be removed and added with a colour before checkout. Existing orders remain readable; their shade is null.

The public stock response now contains `available` instead of `stockQty`. Coordinate API, web and mobile rollout; older installed apps expecting quantities must be updated. Do not deploy this API change without preparing updated clients.

Profile photos are resized in the employee browser and stored as immutable media in D1, limited to 512 KB each and 20 gallery photos per profile. R2 remains unprovisioned. Monitor database growth and move media to object storage when needed. Profile removal removes the listing; uploaded media is retained. No fabricated professional profiles are seeded.

The official logo is `MATRIZO LOGO.jpeg`, copied into each app. Native icons, splash, notification silhouettes, website icons and favicons are generated from it by `apps/mobile/scripts/generate-brand-assets.mjs`. No original brand font file was supplied; the logo preserves its original lettering, while the existing text fonts remain. The web order detail includes a branded printable order receipt, not a tax invoice.

Verification: 15 in-process API/database and mobile session/timeout tests passed, including role restrictions, uploads, shade isolation, stock aggregation and historical order snapshots. All five application/API TypeScript checks and all three web-app lint checks passed. The storefront production build and Android/iOS JavaScript bundle exports passed. Admin and employee production builds were blocked by Google Fonts DNS failures while fetching the existing Geist fonts. Local Expo dependency checks passed using the offline dependency map. Browser rendering and physical-device acceptance remain unverified: this session could not bind a local web port. The Cloudflare-runtime suites could not start; the new route tests use in-memory SQLite and do not replace D1 runtime acceptance. The earlier EAS build status could not be fetched because `api.expo.dev` was unreachable.

Still required for release: official text font if it must replace existing fonts, monitored support mailbox, Firebase Android configuration/FCM credentials, Apple signing/push setup, production migration/deployment, email recovery verification, and device/store acceptance. None of these credentials or business facts is inferred from the logo.

## Scope and current state

The customer app in `apps/mobile` shares products, categories, prices, inventory, users, addresses, carts and orders with the website. Admin and employee portals continue to run on the web. This release uses cash on delivery. Online payments, driver GPS maps, customer reviews, wishlists and SMS OTP are not part of this release.

Implemented: Matrizo branding/icons/splash, email or Indian mobile number + password login, signup, secure persisted sessions with refresh, conditional email password recovery, browsing/search/categories/brands, stock and delivery-pincode checks, quantity/bulk pricing, address management, COD checkout with durable retry references, order history/progress/cancellation, opt-in push notifications, account deletion, and public privacy/support/deletion pages.

Mobile release code is pushed on `codex/mobile-release`. No remote migration, Worker deployment, native signing, store upload or submission is performed by this checklist or the verification scripts.

The app configuration links the verified Expo project [`@nikhilmatrizos-team/matrizo`](https://expo.dev/accounts/nikhilmatrizos-team/projects/matrizo), ID `5e70cf48-6d95-46f7-92e6-7ab78f81e791`. `EXPO_OWNER` and `EXPO_PUBLIC_EAS_PROJECT_ID` are optional overrides for a separate project. Linking these public identifiers does not sign the CLI into Expo or configure signing credentials.

## First Android test build — 16 September 2026

The owner completed Expo CLI authorization. Expo generated and stores the Android signing keystore. Preview build [`1edc360b-4b45-45b0-85f6-c48a7422a56b`](https://expo.dev/accounts/nikhilmatrizos-team/projects/matrizo/builds/1edc360b-4b45-45b0-85f6-c48a7422a56b) was submitted for Matrizo `1.0.0`, Android version code `1`, package `com.matrizo.app`. At submission it was queued in the free tier; a completed APK and physical-device tests are not yet verified. The upload includes the local Expo-linking and preview configuration changes on top of commit `f0edd89`.

The `preview` profile explicitly selects the live API and disables dotenv loading, so a local development URL cannot be included accidentally. The root `.easignore` excludes environment files, signing/provider credentials, Git metadata and generated web/native output. The inspected upload passed a scan for the existing local credential values before submission. Production build variables must be set in the EAS environment because local `.env` files are not uploaded.

This is an internal test build. Production database/API changes, public policy/support pages, working support email, email recovery, Firebase push credentials, physical-device validation and Google Play submission remain pending.

## Local validation

Use Node 24 and pnpm 11.20.0 (repository package manager). From the root:

```sh
corepack enable
CI=true pnpm install --frozen-lockfile
pnpm test
pnpm --filter @matrizo/api exec tsc --noEmit
pnpm --filter @matrizo/mobile typecheck
pnpm --filter @matrizo/web lint
EXPO_NO_DOTENV=1 pnpm --filter @matrizo/mobile exec expo install --check
EXPO_NO_DOTENV=1 pnpm --filter @matrizo/mobile bundle:native
```

Expo generates typed routes on `expo start`. A fresh checkout without `.expo/types` uses the router’s default types; starting the development server generates the stricter route definitions. Never commit generated `.expo` or native build folders.

For UI checks, run `pnpm test:serve`, then start Expo with `EXPO_PUBLIC_API_URL=http://127.0.0.1:8787/api/v1` and `EXPO_NO_DOTENV=1`. This database is disposable and has no production credentials. A local browser walkthrough does not replace physical iPhone and Android tests.

## Verification performed on 16 September 2026

- All 37 API/session/checkout/notification regression tests passed against disposable local D1 databases and mocked providers.
- API and mobile TypeScript checks and website lint passed.
- Website production build, Android/iOS JavaScript bundle exports, and Expo web export passed.
- Android and iOS prebuild generation passed, including brand assets, secure-storage backup rules, push configuration and removal of unused permissions.
- Expo SDK dependency compatibility check passed. Expo Doctor passed 20 of 21 checks; only the native tooling check failed because CocoaPods is not installed on this machine. Full Xcode and Android SDK/device testing have not been performed.
- Phone-width browser walkthrough passed mobile-number sign-in, search, pincode/stock lookup, cart, address creation and COD checkout against the local fixture. Account-deletion and disabled-recovery screens were inspected.
- Release preflight correctly reports the missing project/account/provider settings. Production credentials, email delivery, APNs/FCM delivery and signed binaries are still unverified.

## Configuration still needed before deployment

| Where | Variable / requirement | Purpose |
| --- | --- | --- |
| Expo project / EAS | `EXPO_OWNER`, `EXPO_PUBLIC_EAS_PROJECT_ID` | Optional overrides; the verified Matrizo owner and project ID are already linked in `app.json`. |
| Mobile build | `EXPO_PUBLIC_API_URL` | HTTPS API ending in `/api/v1`; use the correct staging/production environment. |
| Mobile build | `EXPO_PUBLIC_SUPPORT_EMAIL` | Monitored working support mailbox. Resend sending-domain verification alone does not create an incoming mailbox. |
| Website build | `NEXT_PUBLIC_SUPPORT_EMAIL` | Same monitored support contact for public support page. |
| Android build | `GOOGLE_SERVICES_JSON` | EAS file variable pointing to Firebase Android `google-services.json` for `com.matrizo.app`. Keep the file ignored. |
| EAS credentials | FCM V1 service-account credential | Upload through EAS credential management; never embed a service-account private key in the app. |
| EAS credentials | Apple push key, signing certificate, provisioning profile | Configure under the owner’s Apple Developer membership. |
| API Worker secret | `EXPO_ACCESS_TOKEN` | Expo access token with push access; enable enhanced push security for the Expo project. Server-only. |
| API Worker variable | `PUSH_NOTIFICATIONS_ENABLED=true` | Enable after Expo/FCM/APNs are configured and tested. Defaults disabled. |
| API Worker | Existing JWT, database and KV configuration | Reuse the existing backend. Never copy Cloudflare, JWT, Resend or Expo private credentials into `EXPO_PUBLIC_*`. |
| Email recovery | Verified Resend sender and `RESEND_FROM_EMAIL` | Complete the deferred email/DNS setup from `docs/email-setup.md`. Recovery stays unavailable while disabled. |

Copy `apps/mobile/.env.example` to an ignored `.env.local` for local configuration if appropriate. Set build variables in each EAS environment (`development`, `preview`, `production`). Public values are embedded in the binary. Keep secrets out of app config’s `extra` field.

`pnpm --filter @matrizo/mobile release:check` checks the current process environment, with the linked owner and project ID from `app.json` as defaults; it deliberately does not source the repository’s private `.env`. It fails until the project ID, HTTPS API, working support email, owner and Android config path are supplied. The production app config also refuses a build with missing required public settings, or an Android build without the Firebase file. Signing credentials still require verification in EAS.

## Deployment order (run only when approved for launch)

1. Back up the production D1 database using the existing Cloudflare process. Review migration `apps/api/drizzle/0005_eager_the_hunter.sql`. It adds nullable account-deletion/checkout fields and push-device/job tables; existing web clients can continue checking out without a checkout key.
2. Apply pending D1 migrations using the existing `api:db:migrate:remote` script, then deploy the API. Do not deploy this API before the migration is applied.
3. Verify the Worker’s scheduled trigger (`*/5 * * * *`). It retries push delivery and completes deferred personal-data deletion after open orders close. Audit these jobs operationally; a disabled scheduler would delay those actions.
4. Configure and test notification credentials, then set `PUSH_NOTIFICATIONS_ENABLED=true`. `GET /api/v1/account/notifications` should report availability for a signed-in customer.
5. Complete the deferred sending-domain setup if email recovery is to launch. Verify the actual recipient receives a code. Configure incoming support email separately.
6. Set `NEXT_PUBLIC_SUPPORT_EMAIL`, build and deploy the website. Confirm these public URLs work without installing the app: `https://www.matrizo.com/privacy`, `/support`, `/delete-account`. Review the privacy notice for the business’s actual operating practices and publish its legal/business contact information before submission.
7. Link the Expo project, configure the EAS variables and credentials, run `release:check`, then build internal testing binaries. Configure a separate staging API/project for testers where practical.
8. Run the physical-device checklist below. Only then create production builds and submit to TestFlight / Google Play testing before public release.

`eas.json` provides `development`, `development-simulator`, `preview` (Android APK), and `production` (Android AAB / iOS store) profiles. Example commands, from `apps/mobile`, **for the deployment phase**:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest credentials --platform android
npx eas-cli@latest credentials --platform ios
npx eas-cli@latest build --profile preview --platform all
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform android
npx eas-cli@latest submit --profile production --platform ios
```

Run interactive setup as the account owner. iOS internal distribution requires registered test devices or TestFlight. App signing, store memberships, business verification, screenshots, app descriptions, privacy/data-safety declarations and review credentials are deployment/account tasks. Do not claim store approval until it is granted. Check availability of `com.matrizo.app` in the owner’s accounts before building; changing an already-released app’s identifier creates a different app.

## Notification and deletion behavior

Push registration is customer-only, opt-in, bounded to ten devices per account, and tied to the current session version. Password reset, account deletion and deactivation suppress old devices. Sign-out unregisters the device before clearing credentials; when a registered device is offline, sign-out asks the customer to reconnect so notifications are not left active silently.

Committed order events are the durable source for notification jobs. The worker sends the current status only, claims jobs with a lease, retries transient failures, checks Expo receipts after 15 minutes, and removes invalid device tokens. A successful receipt means the push provider accepted delivery, not that a user saw it. Delivery is best effort; a provider accepting a message before a network response is lost can cause a duplicate on retry. Old events expire after 24 hours; old jobs and inactive/stale devices are pruned. Push content contains a generic status and order ID, no name, address or phone. An order opened from a notification still requires authorization.

Deletion requires the account password and explicit confirmation. It immediately deactivates the account, invalidates sessions, clears cart/recovery challenges and unregisters push. If orders remain open, the delivery contact is kept until they are delivered/cancelled; status-change handling and the cron job finish redaction automatically. For closed orders, contact fields and addresses are redacted while order/accounting records remain. Used addresses cannot be edited into different delivery instructions; customers add a new address instead. Before restoring a backup to service, reapply deletions recorded after the backup so deleted personal data is not resurrected. Define an audited backup/deletion restoration procedure with the business before launch.

## Physical-device acceptance checklist

- Install on supported Android and iPhone devices; verify icon, splash, safe areas, keyboard handling, back gestures and large accessibility text.
- Register, sign out, sign in by email and mobile, restart, and let an access token expire. Confirm refresh works and no plaintext token is stored in AsyncStorage.
- Complete email recovery when enabled. Old sessions on another device must stop working; incorrect/expired codes must fail. Check disabled recovery copy when email is not configured.
- Browse all six brands and nested categories, search, check an unsupported pincode, and test missing product images.
- Add/edit/remove addresses and quantities, verify bulk prices and stock failures, and submit a COD order. Confirm the same order is visible on the website and admin portal.
- Interrupt connectivity during checkout and restart the app. Retry must recover the same order, not reserve stock twice. Test two devices using the same account/cart.
- Change order statuses in admin. Verify foreground, background and terminated-app notifications, denial/revocation of permission, token changes, and tapping a notification while signed out.
- Sign out/switch accounts: no prior customer’s addresses, cart or order details may remain visible. Test offline sign-out with notifications enabled.
- Cancel before packing; verify stock restoration and blocked cancellation after packing.
- Delete an account with no open orders; confirm web/mobile access and refresh are revoked. Repeat with an open order, finish/cancel it in admin, and verify contact redaction and retained accounting records.
- Test the public deletion URL on a desktop browser, support mail link on each phone, slow/offline error states, and the store-review demo account.

## Primary references

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [EAS build configuration](https://docs.expo.dev/build/eas-json/)
- [Expo push delivery and receipts](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
