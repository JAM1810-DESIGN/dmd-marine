# Environment Variables

All variables are documented in [`.env.example`](../.env.example). This page explains what each group is for and what breaks if it's missing.

## Required (the app won't start without these)

Validated at startup by `src/lib/env.ts` — a missing or malformed value throws immediately rather than failing later with a confusing error.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. Also required **at build time** — see [DEPLOYMENT.md](./DEPLOYMENT.md#why-the-build-needs-a-database). |
| `AUTH_SECRET` | Signs and encrypts session JWTs. Min 32 characters. Generate with `openssl rand -base64 32`. Rotating it invalidates every active session. |
| `NEXTAUTH_URL` | The app's canonical URL, used by Auth.js for callback/redirect construction. |
| `NEXT_PUBLIC_APP_URL` | The app's public URL — used for sitemap/robots generation, webhook URL display, and OG metadata. Exposed to the browser (`NEXT_PUBLIC_*` prefix). |
| `NEXT_PUBLIC_APP_NAME` | Display name used in page titles and metadata. |

## Database container (docker-compose)

| Variable | Purpose |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials for the Postgres container. Must match the credentials embedded in `DATABASE_URL`. |
| `POSTGRES_PORT` | Host-side port mapping (dev defaults to `5435` to avoid clashing with a local Postgres install). |

## Optional integrations — the app runs without them

Each of these is gated by an `isXConfigured` boolean (`src/lib/storage.ts`, `src/lib/facebook.ts`). When unset, the relevant UI hides the feature instead of failing or faking success.

| Variable | Feature | Where it's checked |
|---|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email | Not yet wired to a send path — reserved for a future phase |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | File uploads (booking attachments, project/expense documents) | `src/lib/storage.ts` — `isStorageConfigured` |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Facebook Messenger/Lead Ads webhook signature verification | `src/lib/facebook.ts` — `isFacebookConfigured` |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Sending Messenger replies and fetching lead/profile data | same |
| `FACEBOOK_WEBHOOK_VERIFY_TOKEN` | The GET handshake when registering the webhook in Meta's dashboard | `src/app/api/facebook/webhook/route.ts` |

## Notes

- `.env` is gitignored; only `.env.example` (with no real secrets) is committed.
- Changing `AUTH_SECRET` in production signs everyone out — treat it like any other credential rotation (planned, not accidental).
- The rate limiter (`src/lib/rate-limit.ts`) and audit log IP capture both read `X-Forwarded-For` — make sure your reverse proxy (nginx, Vercel, etc.) sets this header, or every request will appear to come from the same "unknown" bucket.
