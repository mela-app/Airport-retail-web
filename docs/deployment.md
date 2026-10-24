# Deployment (VPS)

The playground runs on one Linux server with Docker, as two stacks deployed by their own pipelines: the
backend (API and PostgreSQL, in `/opt/arm/api`, no public port) and this web app (Caddy, in `/opt/arm/web`, on
ports 80 and 443). They share only the Docker network `arm-edge`, on which Caddy forwards `/api/*` to
`api:8080`. The backend repository's `docs/deployment.md` covers the whole server; the steps for this repository
are:

## Once

1. **Server:** Docker Engine with the compose plugin, a `deploy` user in the `docker` group, `/opt/arm` owned by
   it, and the firewall open for SSH, 80 and 443. Optionally a DNS `A` record (e.g. `arm.example.com`) pointing
   at the server.
2. **Deploy key:** `ssh-keygen -t ed25519 -N "" -f arm-deploy`, the public key in `deploy`'s
   `authorized_keys`, and `ssh-keyscan -t ed25519 <server> > arm-known-hosts`.
3. **GitHub** (Settings → Secrets and variables → Actions):

   | Kind     | Name              | Value                                                         |
   | -------- | ----------------- | ------------------------------------------------------------- |
   | Variable | `VPS_HOST`        | the server's IP address or host name                          |
   | Variable | `VPS_USER`        | `deploy`                                                      |
   | Variable | `PLAYGROUND_URL`  | the public address, e.g. `https://arm.example.com` (optional) |
   | Secret   | `VPS_SSH_KEY`     | the private key `arm-deploy`                                  |
   | Secret   | `VPS_KNOWN_HOSTS` | the contents of `arm-known-hosts`                             |

4. **Server settings**, `/opt/arm/web/.env` (created empty by the first deploy):

   ```bash
   SITE_ADDRESS=arm.example.com     # automatic HTTPS; leave unset for plain HTTP on the server's IP
   # HTTP_PORT=80  HTTPS_PORT=443  BIND_ADDRESS=0.0.0.0     (defaults)
   ```

## Every release

Push to `main`: verify → security → image → deploy. The deploy job copies `deploy/compose.yaml` to
`/opt/arm/web`, records the image digest in `.image`, pulls it with the job's short-lived registry token and runs
`docker compose up --wait`. The backend stack should be deployed first: it starts the API that `/api` is
forwarded to (the deploy creates the `arm-edge` network if it does not exist yet).

Check: `curl -sI https://arm.example.com/` and `curl -s https://arm.example.com/api/health`.

## Rollback

Re-run the `deploy` job of an earlier successful pipeline run, or on the server:

```bash
cd /opt/arm/web
echo "WEB_IMAGE=ghcr.io/<owner>/<repo>@sha256:<earlier digest>" > .image
docker compose --env-file .env --env-file .image up -d --wait
```

Certificates and Caddy's state live in the `caddy-data` volume and survive redeploys.
