# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
RUN corepack enable

# ── deps ────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# ── build ───────────────────────────────────────────────────────────────────
# The Services and Blog detail pages use generateStaticParams, which queries the
# database during `next build` — so a real, migrated, reachable Postgres instance
# is required at build time, not just at runtime. See docs/DEPLOYMENT.md.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME="DMD Marine Consultation & Services"
ENV DATABASE_URL=${DATABASE_URL} \
    NEXTAUTH_URL=${NEXTAUTH_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
# No page rendered during `next build` calls auth() (the public Services/Blog pages only
# query the database), so AUTH_SECRET only needs to satisfy env.ts's format check here —
# never baked into the image as a real secret. The real value is injected at runtime.
ENV AUTH_SECRET="build-time-placeholder-not-a-real-secret-32chars"

RUN pnpm prisma generate
RUN pnpm build

# ── runtime ─────────────────────────────────────────────────────────────────
# Not using `output: "standalone"` here: combined with root middleware.ts, it fails
# Turbopack's file-trace step on this Next.js version (ENOENT on middleware.js.nft.json).
# Middleware is the more valuable of the two, so this stage ships full node_modules
# and runs the ordinary `next start` instead of the standalone server.js.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Invoke next directly rather than "pnpm start" — avoids corepack needing network
# access to fetch the pnpm distribution again in this fresh build stage.
CMD ["node_modules/.bin/next", "start"]
