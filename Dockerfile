# Stage 1: Elixir dependencies
FROM elixir:1.18-slim AS server-deps

RUN apt-get update -y && \
    apt-get install -y build-essential git && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mix local.hex --force && mix local.rebar --force

WORKDIR /app/server
ENV MIX_ENV=prod

COPY server/mix.exs server/mix.lock ./
RUN mix deps.get --only prod
RUN mix deps.compile

# Stage 2: Client build
FROM node:24-slim AS client-build

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
RUN pnpm install --frozen-lockfile

COPY client/ client/
RUN cd client && pnpm build

# Stage 3: Phoenix release
FROM elixir:1.18-slim AS server-build

RUN apt-get update -y && \
    apt-get install -y build-essential git && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN mix local.hex --force && mix local.rebar --force

WORKDIR /app/server
ENV MIX_ENV=prod

COPY server/mix.exs server/mix.lock ./
COPY --from=server-deps /app/server/deps deps
COPY --from=server-deps /app/server/_build _build

COPY server/config config
COPY server/lib lib
COPY server/priv priv
COPY server/assets assets

# Copy client build into Phoenix static directory
COPY --from=client-build /app/client/build priv/static

# Compile assets and create release
RUN mix assets.deploy
RUN mix compile
RUN mix release

# Stage 4: Runtime
FROM debian:bookworm-slim AS runtime

RUN apt-get update -y && \
    apt-get install -y libstdc++6 openssl libncurses6 locales ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

WORKDIR /app

COPY --from=server-build /app/server/_build/prod/rel/screen ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENV PHX_SERVER=true
EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
