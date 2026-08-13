# syntax=docker/dockerfile:1
#
# Production image for the API — which also serves the built Angular app,
# because the BFF session design requires one origin
# (09-authentication-session-architecture.md). Built from the repo root:
#   docker build -f apps/api/Dockerfile -t dentix-api .
#
# Node is pinned to the exact .nvmrc version rather than a floating major:
# CLAUDE.md requires exact dependency pins, and the runtime is a dependency.

ARG NODE_VERSION=22.23.2

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
# npm ci installs every workspace's dependencies regardless of which one is
# being built, and apps/worker depends on playwright, whose postinstall
# downloads ~400MB of browsers this image never runs (the worker is a
# separate concern and not part of this stack yet — see docker-compose.prod.yml).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# ---- dependency layers -------------------------------------------------
# Manifests are copied on their own so this layer caches on dependency
# changes, not on every source edit.
FROM base AS manifests
COPY package.json package-lock.json ./
COPY packages/kernel/package.json packages/kernel/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/

FROM manifests AS deps
# Longer waits and more retries than npm's defaults. R-03 in
# 07-plans/risks.md is exactly this: registry access from Iran is expected to
# be slow or intermittently blocked, and the default 5-minute timeout turns a
# slow fetch into a failed build. ADR-010 still wants a proper mirror or
# pull-through cache; this makes an unmirrored build survive a bad connection
# in the meantime.
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 900000 \
  && npm ci

# ---- build -------------------------------------------------------------
FROM deps AS builder
# Each workspace owns its own tsconfig.json; this is the shared base they
# all extend, and it lives only at the root.
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY apps/web/ apps/web/
# Order is a real dependency chain, not preference: web and api both compile
# against @dentix/kernel's emitted .d.ts files.
RUN npm run build --workspace @dentix/kernel \
  && npm run build --workspace apps/web \
  && npm run build --workspace apps/api

# Prune in place rather than doing a second `npm ci --omit=dev` in a parallel
# stage. A cleanroom production install is arguably the purer expression of
# "the production dependency set", but it costs a second full download of the
# dependency tree — and R-03 (registry access from Iran is slow and
# intermittently blocked) makes every avoidable network round trip a real
# failure mode, not a theoretical one. This was not hypothetical: the second
# install is exactly what died with ECONNRESET while building this image.
# One install, then prune.
RUN npm prune --omit=dev

# ---- runtime -----------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# @dentix/kernel resolves through a workspace symlink inside node_modules,
# so the real package directory has to exist at its symlink target for the
# copied node_modules to resolve at runtime.
COPY --from=builder /app/packages/kernel/package.json packages/kernel/package.json
COPY --from=builder /app/packages/kernel/dist packages/kernel/dist

COPY --from=builder /app/apps/api/package.json apps/api/package.json
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/web/dist apps/web/dist

# See app.module.ts: findRepoRoot() keys off docker-compose.yml, which
# deliberately does not ship in this image, so the repo walk finds nothing
# here by design and this override is what makes the UI reachable.
ENV WEB_BUILD_ROOT=/app/apps/web/dist/web/browser

# The base image ships an unprivileged `node` user; nothing here needs root.
USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/src/main"]
