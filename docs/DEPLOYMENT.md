# Deployment Guide

Two supported paths: Docker Compose (self-hosted) or Vercel + a managed Postgres. Both need the same environment variables — see [ENVIRONMENT.md](./ENVIRONMENT.md).

## Why the build needs a database

Unlike most Next.js apps, `next build` for this project **needs a real, migrated, reachable Postgres instance** — not just at runtime, but during the build itself. The Services and Blog detail pages (`/services/[slug]`, `/blog/[slug]`) use `generateStaticParams`, which queries the database to know which pages to pre-render. Point the build at an empty/placeholder database and it will either fail to connect or silently produce a site with zero service/blog pages.

This means the build order matters:

1. Postgres must be running.
2. Migrations must already be applied (`prisma migrate deploy`).
3. *Then* `next build` (or `docker build`) can run.

## Option A — Docker Compose

```bash
cp .env.example .env
# fill in every required var — see ENVIRONMENT.md
# use REAL production values, not the dev defaults

# 1. Bring up Postgres only, first
docker compose -f docker-compose.prod.yml up -d postgres

# 2. Wait for it to be healthy, then apply migrations from your local machine
#    (or from a throwaway container with the same DATABASE_URL)
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy

# 3. Now build and start the app — depends_on: condition: service_healthy
#    already waits for postgres, but the migration step above must run first
docker compose -f docker-compose.prod.yml up -d --build app
```

`docker-compose.prod.yml` passes `DATABASE_URL` and the other required vars as both **build args** (so `next build`'s `generateStaticParams` can reach the database) and **runtime env vars** (so the running container can too). Both come from the same `.env` file via Compose's variable substitution.

The `app` container runs as a non-root user, serves the Next.js `standalone` output (`node server.js`), and listens on `PORT=3000` internally — map it to whatever host port you want via `APP_PORT` in `.env`.

Put a reverse proxy (nginx, Caddy, Traefik) in front for TLS termination; the app itself serves plain HTTP. Make sure the proxy sets `X-Forwarded-For` — the rate limiter and audit log both key on it, and everything looks like the same client without it.

### Running migrations on future deploys

```bash
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d --build app
```

Never run `prisma migrate dev` against production — it's an interactive/dev-only command that can prompt for destructive confirmations. `migrate deploy` only applies already-committed migration files.

## Option B — Vercel

Works if you use a managed Postgres reachable from Vercel's build environment (Vercel Postgres, Neon, Supabase, RDS with a public endpoint, etc.) — Vercel's own build step needs the same database access described above.

1. Import the repo into Vercel.
2. Set every variable from `.env.example` in Project Settings → Environment Variables (production + preview as needed).
3. Apply migrations against the production database *before* the first deploy (`prisma migrate deploy` from your machine or a CI step), and before every subsequent deploy that includes a migration.
4. Deploy. Vercel's build runs `next build`, which will reach the database the same way it does locally.

The app doesn't use any Vercel-specific APIs (no Edge Functions, no `@vercel/*` packages) — it's a standard Next.js app, so this isn't a hard dependency on Vercel specifically, just a supported target.

## Security headers and CSP

`next.config.ts` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS, and a `Content-Security-Policy` on every response. The CSP is intentionally strict (`script-src 'self'`, no third-party origins) because the app doesn't load any third-party scripts or fonts — Google Fonts are self-hosted via `next/font`, and Cloudinary/Facebook are only ever called server-side. If you add a client-side third-party script later (analytics, a chat widget), you'll need to widen the CSP in `next.config.ts` to match.

## Health check

`GET /api/health` returns `{"status":"ok","db":"connected"}` and a 200, or a 500 if Postgres is unreachable — wire your orchestrator's liveness/readiness probe to it.

## Rollback

Since there's no in-place data migration tooling beyond Prisma's own history, rolling back a bad deploy means: redeploy the previous image/commit, and if a migration shipped with it needs undoing, write and apply a compensating migration — Prisma doesn't support automatic down-migrations. This is another reason to [back up before every migrating deploy](./BACKUP.md).
