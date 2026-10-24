# syntax=docker/dockerfile:1
#
# The web app, built with Vite and served by Caddy, which also forwards /api to the backend.
#   docker build -t arm-web .
#   docker run -p 8080:80 --network arm-edge arm-web       (the backend stack provides `api` on arm-edge)
# Both stages start from images pinned by version and digest.

# ---- build ----------------------------------------------------------------------------------------------------
FROM node:24.22.0-alpine3.24@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS build
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json vite.config.ts index.html ./
COPY public public
COPY src src
RUN pnpm build

# ---- runtime: static files + reverse proxy ---------------------------------------------------------------------
FROM caddy:2.11.6-alpine@sha256:d44355d3c2149dc580ce2cac735955d1c08d3d00882c30489c241aa51a5c10d9 AS runtime
# Caddy runs as a non-root user with every capability dropped and no-new-privileges. Docker lets unprivileged
# processes bind ports 80 and 443 inside a container (net.ipv4.ip_unprivileged_port_start=0, the default since
# Docker 20.10 and set explicitly in the compose files), so the binary is copied without its file capability
# (cap_net_bind_service), which no-new-privileges would refuse to execute.
RUN install -m 0755 /usr/bin/caddy /usr/local/bin/caddy && rm /usr/bin/caddy \
    && addgroup -S web && adduser -S -G web -H -h /data web \
    && mkdir -p /data /config \
    && chown web:web /data /config
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
ENV XDG_DATA_HOME=/data \
    XDG_CONFIG_HOME=/config
USER web
EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["nc", "-z", "127.0.0.1", "80"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
