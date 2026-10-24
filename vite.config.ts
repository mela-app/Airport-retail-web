/**
 * Vite config. The backend runs on its own port and `/api` (REST and the SSE stream) is proxied to it, so the
 * browser only ever talks to one origin, in development (`pnpm dev`) and when serving the build (`pnpm preview`,
 * which is what the Docker image runs). `host: true` serves the app on the LAN so a phone can open the claim
 * page behind a screen's QR code.
 *
 *   API_PROXY_TARGET   where the backend listens (default http://127.0.0.1:3000)
 *   WEB_PORT           port of this server (default 5173)
 *   ALLOWED_HOSTS      extra host names the server answers to, comma-separated (e.g. arm.example.com), or
 *                      "all"; localhost, IP addresses and the playground's domain are always allowed
 */
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/** The public playground's domain. */
const PLAYGROUND_HOSTS = ['airportweb.kefta-ticket.com'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const target = env.API_PROXY_TARGET || 'http://127.0.0.1:3000';
  const webPort = Number(env.WEB_PORT || '5173');
  const proxy = { '/api': { target } };
  const hosts = (env.ALLOWED_HOSTS ?? '').trim();
  const allowedHosts =
    hosts === 'all'
      ? true
      : [
          ...PLAYGROUND_HOSTS,
          ...hosts
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean),
        ];
  return {
    plugins: [react()],
    server: { host: true, port: webPort, strictPort: true, proxy, allowedHosts },
    preview: { host: true, port: webPort, strictPort: true, proxy, allowedHosts },
    build: { outDir: 'dist', sourcemap: true },
  };
});
