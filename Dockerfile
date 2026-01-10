FROM node:24.12-slim AS base
RUN apt-get update -y && apt-get install -y openssl
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the app
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm svelte-kit sync
RUN pnpm prisma generate
RUN pnpm build

# Production image
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built app and generated files
COPY --from=build /app/build ./build
COPY --from=build /app/generated ./generated
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/prisma ./prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
