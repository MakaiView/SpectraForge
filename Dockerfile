# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# SpectraForge production image. Node 22 LTS (avoids the Node 23 webpack bug we
# hit on the Mac — here we use the standard `next build`). Multi-stage → small
# standalone runtime. See SETUP_HOMELAB.md.
#
# NEXT_PUBLIC_* are inlined into the CLIENT bundle at BUILD time, so the public
# Supabase URL + anon key must be passed as build args (not just runtime env).
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public (client-inlined) values — pass via docker/compose build args.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Standard webpack build (Node 22) → emits .next/standalone + .next/static.
RUN npx next build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone server + static assets + public/. sharp (server-external) is traced
# into standalone/node_modules; if it ever fails to load, `npm i sharp` here.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
# Runtime env (Supabase service key, Ollama, etc.) is injected by compose.
CMD ["node", "server.js"]
