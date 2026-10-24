# syntax=docker/dockerfile:1
#
# The web app: built with Vite and served by Vite's preview server, which also forwards /api to the backend.
#   docker compose up -d --build                (see compose.yaml; the backend stack must be running)
# For a production web server of your own (e.g. nginx), serve the dist/ folder instead (README, "Hosting").
# Both stages start from the same pinned image (version and digest).

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

# ---- runtime: the built app on Vite's preview server ----------------------------------------------------------
FROM node:24.22.0-alpine3.24@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS runtime
ENV NODE_ENV=production \
    WEB_PORT=8080 \
    API_PROXY_TARGET=http://api:8080
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/vite.config.ts ./
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["nc", "-z", "127.0.0.1", "8080"]
# The config is loaded in memory (no temporary file), so the container can run on a read-only file system.
CMD ["node", "node_modules/vite/bin/vite.js", "preview", "--configLoader", "runner"]
