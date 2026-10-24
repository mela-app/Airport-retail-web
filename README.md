# Airport Retail Media Platform: web app

Ads and promotions on airport screens, chosen for **the passengers actually in front of each screen**. This
repository is the web app: the views of the five roles (admin, retailer, media manager, airline, passenger
screen), the simulation bar, split screen, the guided demo and the claim page that a passenger opens on a phone
from a screen's QR code.

Everything runs against a fictional airport, **Meridian International (MQI)**, with invented airlines, brands,
outlets and places. No personal data: every audience figure is an aggregate.

The platform is two repositories (`backend/` and `frontend/`, side by side in `Airport-Retail-Media/`) with no code in common; they meet only over HTTP:

| Repository              | What it is                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **backend**             | Adapters, simulation, presence model, decision engine, analytics; REST + SSE API (NestJS) |
| **frontend** (this one) | The web app (React): five roles, simulation bar, split screen, phone claim page           |

The app calls the backend on its own origin under `/api` (REST and the live event stream): the Vite dev server
forwards it in development, and the web server that hosts the build does in production (see
[Hosting](#hosting)). No CORS, and QR claim links work wherever the page is opened.

**Playground:** https://airportweb.kefta-ticket.com (press **Demo** in the top bar for the guided walkthrough) ·
**API docs:** https://airportweb.kefta-ticket.com/api/docs

## Try it in five minutes

1. Press **Demo** (top bar). The guide loads the worked example: Gate 42 at 14:10, with Halcyon Airways on the
   left and the Gate 42 screen on the right (split screen).
2. **Why this ad?** 420 passengers wait at gates 42–43 (58% holiday, 57% international, XH501 already 45
   minutes late). The perfume offer scores 0.86 and plays; toys (0.52) come next; the lounge (0.21) is held back.
3. **Inject the delay.** XH501 slips another 30 minutes. The Gate 42 screen re-plans in well under a second to
   Halcyon's goodwill meal voucher, co-funded by Brewline Coffee. The guide shows the measured time.
4. **Scan the QR code with a phone.** The claim page shows the offer, a countdown to XH501's gate closing, the
   outlet, and a personal code with one extra code to share with family. The sale appears on Brewline's
   retailer dashboard.
5. **Operations.** Take the screen offline (the admin map turns red; an incident opens after 5 simulated
   minutes), see why one campaign beat another, pin an override with a reason.

[docs/demo-script.md](docs/demo-script.md) is the full 15-minute script.

## Run it

Start the backend first (its repository: `docker compose up -d --build`, or `pnpm --filter @arm/api dev`; API on
port 3000).

**With Docker (one command):**

```bash
docker compose up -d --build      # → http://localhost:8080
```

The container serves the built app with Vite's preview server and forwards `/api` to the backend's container
(`api:8080` on the `arm-net` network that the backend's `docker compose` creates). Optional settings go in a
`.env` file next to `compose.yaml`: `WEB_HOST_PORT` (host port, default 8080), `BIND_ADDRESS=0.0.0.0` (reachable
from phones on the LAN), `ALLOWED_HOSTS` (domain names, when opened under a domain). Stop it with
`docker compose down`.

**Locally** (Node.js 22+, pnpm 11 via `corepack enable`):

```bash
pnpm install
pnpm dev          # → http://localhost:5173, proxies /api to http://127.0.0.1:3000, also on the LAN for phones
pnpm test
```

`API_PROXY_TARGET` and `WEB_PORT` (see [.env.example](.env.example)) change the backend address and the port.
The dev server is also on the LAN, so a phone on the same Wi-Fi can follow a screen's QR code.

**Production build:** `pnpm build` writes the static app to `dist/`; `pnpm preview` serves it on port 5173
with the same `/api` forwarding.

## What each role can do

No login: the header switches role, and retailer and airline views switch company (`?as=…` in the address,
so any view can be shared). One design system, a dark control-room theme for the admin and a light theme for
the business roles, English and Arabic (right to left), usable at 1440 and 1920 px.

| Role              | Dashboard and pages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Admin**         | Control room: KPI strip (screens online, plays, impressions, revenue, campaigns, latency), live network map of T1/T2 with screen status and a presence heat overlay, incidents raised automatically (screen offline 5 min, feed lag, failed creative) with owner and status, feed health, engine performance · **Master data** (vendors, airlines, outlets, zones, gates, screens) · **Decision log** with the full evidence trail · **Rules & model** (score weights, relevance floor, exploration, frequency, competitor separation, airline priority; model version and learned performance)                                                                    |
| **Retailer**      | Live KPIs; passenger flow in the company's zones for the next 2 hours ("Next 60 min: about 5,100 passengers, 57% international, top destinations …"); recent sales (phone claims highlighted); sales by hour · **Campaigns**: pause/resume, stock toggle, run again, 30-day ROI, who redeems (share of redemptions vs share of passengers) with suggested weights in one click, A/B creatives, **best 3 slots tomorrow** with one-click booking, shareable report · **Campaign builder** with a live audience-match preview on the campaign's screens and a mock screen · **Creatives** with the **GenAI creative assistant** (English + Arabic) · **Promo codes** |
| **Media Manager** | Occupancy, media revenue, delivery per advertiser against pacing (under-delivery flagged), 7-day outlook · **Inventory & pricing**: screen × hour calendar (booked / available / premium) with suggested prices, package builder · **Approvals** with a brand-safety checklist · **Audience & conflicts**: segment heat map, why A beat B, manual pins with a reason · advertiser report links                                                                                                                                                                                                                                                                     |
| **Airline**       | Flights today on a timeline (boarding windows, delays), aggregated profile of its passengers, partner offers ranked by fit · **Gate screens**: what plays at its gates and why; its gate-area messages (priority in its boarding windows) · **Offers & goodwill**: delay-goodwill automation (co-funded voucher to the gate screens) with live activations and an editable threshold, co-marketing marketplace                                                                                                                                                                                                                                                     |
| **Passenger**     | Full-screen 16:9 / 9:16 player for any screen with the departures strip, promo QR with countdown and a **Why this ad?** panel (crowd, top candidates and scores, rules, AI checks) · mobile **claim page** for real phones                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Every view has the **simulation bar**: airport time, play/pause, 1x/10x/60x, jump to a time, the worked example,
reset, and event injection (flight delay, gate change, screen offline/online). **Split screen** shows two roles
side by side under one clock.

## How it works

- **Live updates:** one Server-Sent Events connection per tab (`/api/stream`), shared by both panes of split
  screen. The clock is extrapolated between server ticks; each view refetches its data when its topics fire
  (debounced), so every role follows the same simulated world.
- **Routing:** a small own router (`/admin`, `/retailer/campaigns`, `/claim/<token>`, `/report/<advertiser>`,
  `/split`, …); a second router instance drives each pane of split screen.
- **Design system:** CSS design tokens with dark and light themes, components in `src/ui`, SVG charts with
  hover details, 20 SVG creative artworks and 5 creative templates.
- **Languages:** English and Arabic with a typed message catalogue (`src/i18n`; Arabic must translate every
  key). Arabic switches the whole layout to right to left; numbers use Latin digits. Times are always airport
  time (UTC+04:00).
- **White label:** [public/brand.json](public/brand.json) (product, operator and airport names, accent colour,
  default language) is loaded at start-up; replace `brand.json` in the deployed `dist/` to rebrand without
  rebuilding.
- **Phones:** the claim page is a mobile layout that needs no app and no personal data.

## Stack and why

| Layer   | Choice                                   | Why                                                                                                   |
| ------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| UI      | React 19, TypeScript                     | Typed views over the backend's JSON; few dependencies (react, react-dom and a QR encoder)             |
| Build   | Vite 8                                   | Fast builds; the dev proxy for `/api` makes development match production's single origin              |
| Styling | Plain CSS with design tokens, SVG charts | Full control of the design system, dark/light themes and right-to-left layout without a CSS framework |
| Tests   | Vitest                                   | Router, role registry, airport-time formatting, clock extrapolation, brand validation, translations   |

## Quality

- **Checks:** strict typecheck, ESLint, Prettier and the tests run on every push.
- **Security scanning:** `bash scripts/scan.sh` runs the reviewers' commands unchanged on a clean export
  (`trivy fs --scanners vuln,secret,misconfig,license` and `opengrep --config=r/all`); neither reports anything
  above INFO. Dependencies are pinned; pnpm installs only versions public for at least 7 days, blocks
  non-registry sub-dependencies and refuses trust downgrades.
- **No inline scripts:** the build works under a strict Content-Security-Policy (`script-src 'self'`).

## Hosting

The Docker image above is the easy way to run the app. To host the build with your own web server instead
(e.g. nginx), `pnpm build` → `dist/` (static files) and the web server needs to:

1. **Serve `dist/`**, and answer every path that is not a file with `index.html` (client-side routes such as
   `/claim/<token>`, `/report/<id>`, `/retailer/campaigns`).
2. **Forward `/api/`** to the backend (for example `http://127.0.0.1:3000`), keeping the request path, with:
   - response buffering **off** and a long read timeout (at least 1 hour): `/api/stream` is a Server-Sent
     Events stream that must reach the browser message by message;
   - the original `Host` header and `X-Forwarded-Proto` (the backend builds the QR claim links from them;
     set the backend's `TRUST_PROXY` so it trusts this server).
3. **Serve HTTPS** for the public domain.

Recommended: cache `assets/*` for a year (file names are content-hashed), `index.html` with `no-cache`, and
send `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self';
frame-ancestors 'none'` plus `X-Content-Type-Options: nosniff`.

## CI

One workflow, [.github/workflows/ci.yml](.github/workflows/ci.yml):

| Job        | When              | What                                                                                                             |
| ---------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `verify`   | every push and PR | install (frozen lockfile), build, typecheck, lint, format check, tests                                           |
| `security` | every push and PR | the reviewers' Trivy and OpenGrep commands (pinned, checksum-verified scanners); fails on any finding above INFO |
| `build`    | push to `main`    | the production build, kept as the workflow artifact `web-dist-<commit>` (the `dist/` folder to host)             |

## Repository layout

| Path           | What it is                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| `src/app`      | App shell: configuration and brand loading, role and page registry, routes  |
| `src/shell`    | Header, simulation bar, event injection, split screen, demo guide           |
| `src/pages`    | The views of each role, the claim page and the advertiser report            |
| `src/ui`       | Design-system components: controls, tables, overlays, charts, QR code       |
| `src/creative` | Creative templates and artworks (what the screens show)                     |
| `src/lib`      | API client, live updates, hooks, formatting, types of the backend's replies |
| `src/i18n`     | English and Arabic messages                                                 |
| `src/styles`   | Design tokens and styles                                                    |
| `public/`      | `brand.json` (white label), favicon                                         |
| `scripts/`     | `scan.sh` (the reviewers' scanners), `install-scanners.sh`                  |
| `docs/`        | Demo script                                                                 |
