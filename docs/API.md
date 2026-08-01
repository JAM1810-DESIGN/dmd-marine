# API

Almost every mutation in this app goes through a Next.js **Server Action**, not a REST endpoint — server actions live as `"use server"` functions in each feature's `actions.ts` (e.g. `src/app/dashboard/bookings/actions.ts`), are called directly from React components, and aren't meant to be called from outside the app. Every one of them enforces its own authorization via `requireRole()` (`src/lib/rbac.ts`) and validates input with a Zod schema before touching the database.

The routes below are the actual `app/api/*` surface — the small set of things that genuinely need to be an HTTP endpoint (an external caller, a health check, or NextAuth's own handler).

## `GET/POST /api/auth/[...nextauth]`

Auth.js's own handler (`src/auth.ts`). Handles sign-in (`POST` from the login form's `signIn()` call), session reads, and sign-out. Not meant to be called directly — go through `signIn()`/`signOut()`/`auth()` from `@/auth` instead.

## `GET /api/health`

Liveness/readiness check for container orchestrators and uptime monitors.

```
GET /api/health
→ 200 { "status": "ok", "db": "connected" }
→ 500 (via the shared error handler) if the database is unreachable
```

Runs `SELECT 1` against Postgres — cheap, and proves the actual dependency the app needs, not just that the Node process is alive.

## `GET/POST /api/facebook/webhook`

Meta's Messenger + Lead Ads webhook callback. Register `{NEXT_PUBLIC_APP_URL}/api/facebook/webhook` in the Meta App's Webhooks settings, subscribed to the `messages` and `leadgen` fields.

**`GET`** — the one-time verification handshake Meta performs when you register the URL. Compares `hub.verify_token` against `FACEBOOK_WEBHOOK_VERIFY_TOKEN` and echoes back `hub.challenge` if it matches.

**`POST`** — the actual event delivery. Every request is checked against `X-Hub-Signature-256` (HMAC-SHA256, keyed with `FACEBOOK_APP_SECRET`) before the body is trusted — this is the endpoint's real access control; there's no session/role check because Meta's servers, not a logged-in user, are the caller. Two event shapes are handled:

- **`messaging`** events — a Messenger message from a page-scoped user (`psid`). Creates or reuses a `FacebookLead` keyed by `psid`, logs the message, and creates a `FACEBOOK_MESSAGE` notification. Echoes of the business's own outgoing messages (`is_echo: true`) are ignored.
- **`changes` with `field: "leadgen"`** — a Lead Ads form submission. Fetches the full lead data via the Graph API (`fetchLeadgenData`) if credentials are configured, creates a `FacebookLead` keyed by `leadgenId` (idempotent — a duplicate delivery of the same lead is a no-op), and creates a notification.

If `FACEBOOK_*` env vars aren't set, `isFacebookConfigured` is `false` and the handler still records the raw event but skips the Graph API enrichment calls — see `src/lib/facebook.ts`.

## Everything else is a Server Action

If you're integrating with this app from outside (a script, a different service), there is intentionally no general-purpose REST/JSON API to call. The dashboard's data (bookings, CRM, finance, reports) is only reachable through the authenticated Next.js app itself. If you need external programmatic access to this data, that's a new, explicit API surface to design — not something to bolt onto the existing server actions.
