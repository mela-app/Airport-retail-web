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
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/web
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
