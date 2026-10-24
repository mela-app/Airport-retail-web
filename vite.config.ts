/**
 * Vite config. In development the backend runs on its own port and `/api` (REST and the SSE stream) is proxied
 * to it, so the browser only ever talks to one origin (in production the Caddy server in the image does the
 * same). `host: true` serves the app on the LAN so a phone can open the claim page behind a screen's QR code.
 *
 *   API_PROXY_TARGET   where the backend listens (default http://127.0.0.1:3000)
 *   WEB_PORT           port of this dev server (default 5173)
 */
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const target = env.API_PROXY_TARGET || 'http://127.0.0.1:3000';
  const webPort = Number(env.WEB_PORT || '5173');
  const proxy = { '/api': { target } };
  return {
    plugins: [react()],
    server: { host: true, port: webPort, strictPort: true, proxy },
    preview: { host: true, port: webPort, strictPort: true, proxy },
    build: { outDir: 'dist', sourcemap: true },
  };
});
