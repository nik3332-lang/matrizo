# Matrizo password-reset email

Sender: **Matrizo <info@matrizo.com>** via Resend. The API key is stored only in the ignored root `.env` and the API Worker's secret binding. Keep the Worker's `RESEND_FROM_EMAIL` unset until Resend reports the domain as verified, then set it to `Matrizo <info@matrizo.com>` to activate delivery. The frontend never receives the key.

Resend domain ID: `9d88fb63-7f56-42b6-8fe9-0902d78abf50`.

## DNS verification

Add these records to the existing `matrizo.com` Cloudflare zone, with automatic TTL. The CNAME must be DNS only (not proxied). Do not replace the root domain's MX records or other mail-provider records.

| Type | Name | Content | Priority |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCfJMV8OtZ4S/v21la6XXV4nHFxiVLs6B9OKPYAHHBaN05VDe5KGuHTQ5660a0Gs8VuORq15Y/vgiT2llSE9rmRYJoDPZqNkRQbG0vUJoJ4Nx+8iSPQxzaWYfkykoVIS+6BPT/S5Po/UwoahJQd1n7mOjPGnhmxl6dmNrsHmqMsbwIDAQAB` | — |
| MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| CNAME | `rsend` | `send.forge.rmta.net` | — |

The existing Cloudflare token returned HTTP 403 for DNS access. For automated setup, place a token scoped to **Zone → DNS → Edit** for **matrizo.com** in the ignored `.env` as `CLOUDFLARE_DNS_API_TOKEN`. Do not paste credentials into documentation or commit them.

After adding the records, verify the domain in Resend. Sender verification enables outgoing mail from `info@matrizo.com`; it does not create a mailbox for reading replies. Incoming mail requires a mailbox provider or forwarding destination.

Sources: [Resend domain setup](https://resend.com/docs/api-reference/domains/create-domain), [domain verification](https://resend.com/docs/api-reference/domains/verify-domain), [send email](https://resend.com/docs/api-reference/emails/send-email).

## Recovery verification

`pnpm test` runs 19 isolated integration scenarios, including mobile/email sign-in, legacy number formats, email delivery through a mock Resend endpoint, expiry, five-guess exhaustion, single-use and concurrent redemption, resend invalidation, account/role isolation, provider failures and revocation of old access/refresh tokens. No real customer account is changed or emailed by these tests.

The full Next/OpenNext production build, API TypeScript and storefront lint pass. Desktop and 390px mobile browser checks cover mobile sign-in and the email recovery request/code forms. Live delivery remains pending DNS verification.
