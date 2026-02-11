# Find eligible builder and runner images on Docker Hub. We use Ubuntu/Debian
# instead of Alpine to avoid DNS resolution issues in production.
#
# https://hub.docker.com/r/hexpm/elixir/tags?name=ubuntu
# https://hub.docker.com/_/ubuntu/tags
#
ARG ELIXIR_VERSION=1.19.4
ARG OTP_VERSION=28.2
ARG DEBIAN_VERSION=bookworm-20260202-slim

ARG BUILDER_IMAGE="docker.io/hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="docker.io/debian:${DEBIAN_VERSION}"

# ---- Client build ----
FROM node:24-bookworm-slim AS client
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
RUN pnpm install --frozen-lockfile
COPY client/ client/
RUN cd client && pnpm build
RUN cd client && pnpx @tailwindcss/cli --input src/routes/layout.css --output ../server/priv/static/assets/css/app.css --minify

# ---- Server build ----
FROM ${BUILDER_IMAGE} AS builder

# install build dependencies
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential git \
  && rm -rf /var/lib/apt/lists/*

# prepare build dir
WORKDIR /app

# install hex + rebar
RUN mix local.hex --force \
  && mix local.rebar --force

# set build ENV
ENV MIX_ENV="prod"

# install mix dependencies
COPY server/mix.exs server/mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# copy compile-time config files before we compile dependencies
# to ensure any relevant config change will trigger the dependencies
# to be re-compiled.
COPY server/config/config.exs server/config/${MIX_ENV}.exs config/
RUN mix deps.compile

COPY server/priv priv
COPY --from=client /app/server/priv/static/ priv/static/
COPY server/lib lib

# Compile the release
RUN mix compile

# Changes to config/runtime.exs don't require recompiling the code
COPY server/config/runtime.exs config/
COPY server/rel rel

RUN mix assets.deploy
RUN mix release

# start a new build stage so that the final image will only contain
# the compiled release and other runtime necessities
FROM ${RUNNER_IMAGE} AS final

RUN apt-get update \
  && apt-get install -y --no-install-recommends libstdc++6 openssl libncurses6 locales ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
  && locale-gen

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

WORKDIR "/app"
RUN chown nobody /app

# set runner ENV
ENV MIX_ENV="prod"

# Only copy the final release from the build stage
COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/screen ./

USER nobody

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4000}/health || exit 1

CMD ["/app/bin/server"]
