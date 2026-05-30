# syntax=docker/dockerfile:1
#
# Production image for Kiyotaka Academy (Next.js 16 + Prisma + MySQL).
# Uses the full node_modules + `next start` (not standalone) so the Prisma
# client/engine and the OG font reads "just work" without tracing surgery.
#
# Build:  docker build -t academy .
# Run:    see docker-compose.yml (brings up MySQL too)

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# openssl is required by the Prisma query engine at build + runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
WORKDIR /app

# Install dependencies (cached on lockfile changes).
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the app (generates the Prisma client, runs prebuild + next build).
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# Runtime image. Full node_modules carried over (includes the generated
# Prisma client + the prisma CLI used by the entrypoint migration step).
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/messages ./messages
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3000
# entrypoint applies `prisma migrate deploy`, then runs the CMD.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["pnpm", "start"]
