# SETUP_HOMELAB.md — Deploy SpectraForge to a Proxmox LXC

A concrete, copy-pasteable walkthrough for **this** codebase: create the LXC, run
self-hosted Supabase + the Next.js app in Docker, put Caddy + TLS in front, seed
the first admin, and set up the ongoing **Mac → GitHub → LXC** deploy loop.

This implements BUILD_SPEC §2 (Option A: full self-hosted Supabase). You develop
on the Mac with the Supabase CLI; the LXC only runs Docker.

---

## Architecture

```
                    Internet
                       │  (Cloudflare Tunnel — no inbound ports)
                       ▼
        ┌──────────────────────────────┐   Proxmox LXC (Debian 12, Docker)
        │            Caddy              │   auto-TLS reverse proxy
        │  sf.example.com  → app:3000   │
        │  sf-api.example.com → kong    │ (API paths only; Studio stays LAN)
        └───────┬───────────────┬───────┘
                │               │        ── shared docker network: sfnet ──
      ┌─────────▼──────┐  ┌─────▼───────────────────────────────────┐
      │  Next.js app   │  │  Supabase stack (supabase/docker)       │
      │  (this repo)   │  │  kong · auth · rest · storage · db ·    │
      │  server.js     │  │  studio (LAN-only) · realtime · …       │
      └────────────────┘  └─────────────────────────────────────────┘
```

The browser talks to the app over `sf.example.com` and to Supabase over
`sf-api.example.com` (so `NEXT_PUBLIC_SUPABASE_URL` = the API host). The app's
server code uses that same URL. Studio is never proxied — reach it on the LAN at
`http://<lxc-ip>:8000`.

---

## 0. Prerequisites

- A Proxmox host, and a domain you can point at it (or a Cloudflare Tunnel).
- This repo on GitHub: `github.com/MakaiView/SpectraForge`.
- On your Mac (dev): Node 22+, Docker Desktop, the Supabase CLI (`brew install supabase/tap/supabase`).

---

## 1. Create the LXC

Proxmox → **Create CT**:

- Template: **Debian 12**, **unprivileged**.
- **4 vCPU / 8 GB RAM / 40 GB disk** (the Supabase stack is ~10 services).
- After creating, before starting, enable Docker-in-LXC features. On the Proxmox
  host shell (replace `<CTID>`):

  ```bash
  # Enable nesting + keyctl so Docker runs inside the unprivileged container.
  pct set <CTID> --features nesting=1,keyctl=1
  pct start <CTID>
  ```

> If Docker misbehaves on the unprivileged LXC, a small **VM** is a valid
> fallback (Docker is happier in a VM) — the rest of this guide is identical.

Enter the container: `pct enter <CTID>` (or SSH in).

## 2. Install Docker in the LXC

```bash
apt update && apt install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
docker run --rm hello-world   # sanity check
```

Create the shared network the app + Supabase both join:

```bash
docker network create sfnet
```

## 3. Bring up self-hosted Supabase

```bash
cd /opt
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

Edit `.env` and set strong values (BUILD_SPEC §2a):

- `POSTGRES_PASSWORD` — strong; you'll reuse it in `SUPABASE_DB_URL`.
- `JWT_SECRET` (≥32 chars), then regenerate matching `ANON_KEY` + `SERVICE_ROLE_KEY`
  (use the generator at supabase.com/docs/guides/self-hosting/docker, or the
  Supabase CLI).
- `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` — Studio basic-auth.
- `SITE_URL=https://sf.example.com`, `API_EXTERNAL_URL=https://sf-api.example.com`,
  `SUPABASE_PUBLIC_URL=https://sf-api.example.com`.
- `SMTP_*` — for auth emails (optional at first; the seeded admin doesn't need it).

Attach `kong` + `db` to `sfnet` **without forking** the upstream compose — copy in
the override from this repo and include it:

```bash
cp /opt/SpectraForge/deploy/supabase-network-override.yml .   # (after step 4 clones the repo)
docker compose pull
docker compose -f docker-compose.yml -f supabase-network-override.yml up -d
```

> Do **not** publish kong's port to the internet from here — Caddy (step 5) is the
> only public door, and it exposes just the API paths. Studio stays on the LAN at
> `http://<lxc-ip>:8000` (basic-auth protected).

## 4. Clone SpectraForge + configure env

```bash
cd ~
git clone https://github.com/MakaiView/SpectraForge
cd SpectraForge
cp .env.production.example .env.production
```

Fill `.env.production` (see the file's comments):

- `NEXT_PUBLIC_SUPABASE_URL=https://sf-api.example.com`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=` ← Supabase `.env` `ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY=` ← Supabase `.env` `SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL=postgresql://postgres:<POSTGRES_PASSWORD>@db:5432/postgres`
- `SF_APP_DOMAIN` / `SF_API_DOMAIN` / `SF_ACME_EMAIL`
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (registration ships closed).

(If you didn't in step 3, copy the override now:
`cp deploy/supabase-network-override.yml /opt/supabase/docker/` and re-run the
Supabase `up` command from step 3.)

## 5. Reverse proxy + external access

Caddy is defined in `deploy/docker-compose.app.yml` and reads `deploy/Caddyfile`
(app + API-paths-only). It gets certs automatically once DNS points at the LXC.

**External access without opening inbound ports — Cloudflare Tunnel (recommended):**

```bash
# In the LXC, install cloudflared and create a tunnel routing your two hostnames
# to Caddy (or straight to the containers). Point:
#   sf.example.com      → http://localhost:80  (Caddy)  or  app:3000
#   sf-api.example.com  → http://localhost:80  (Caddy)  or  kong:8000
```

If Caddy is behind the tunnel and shouldn't fetch public certs, add `tls internal`
in the Caddyfile blocks. For LAN-only use, likewise use `tls internal` and hit the
LXC IP directly. For a public IP with ports 80/443 forwarded, the Caddyfile works
as-is.

## 6. First deploy

From `~/SpectraForge` on the LXC:

```bash
# Build + start the app + Caddy (joins sfnet).
docker compose -f deploy/docker-compose.app.yml up -d --build

# Apply the DB schema (same migrations as local dev) to self-hosted Postgres.
./deploy/migrate.sh
```

`migrate.sh` runs `supabase db push --db-url $SUPABASE_DB_URL` in a throwaway
container on `sfnet`. It creates every table, RLS policy, trigger, and the 5
Storage buckets (migrations `0001`–`0007`).

**Seed the first admin** (registration is closed, so this is the only way in).
Easiest from your **Mac**, where node_modules already exist — point a temporary
`.env.local` at the LXC and run:

```bash
# On the Mac, with .env.local set to the LXC's public URL + service key:
npm run db:seed-admin
```

Or on the LXC via a throwaway container:

```bash
docker run --rm --network sfnet --env-file .env.production -v "$PWD:/work" -w /work \
  node:22-slim sh -c "npm i --no-save @supabase/supabase-js && node scripts/seed-admin.mjs"
```

**(Optional) Seed the manufacturer baselines** — the transcribed ComMarker Omni
X + Snapmaker settings in `seed/manufacturer-presets/baselines/`. Same pattern
as the admin seed (needs the same env):

```bash
# On the Mac:  npm run db:seed-baselines
# Or on the LXC:
docker run --rm --network sfnet --env-file .env.production -v "$PWD:/work" -w /work \
  node:22-slim sh -c "npm i --no-save @supabase/supabase-js && node scripts/seed-baselines.mjs"
```

Now browse to `https://sf.example.com`, sign in as the seeded admin, and open the
Admin Console to invite users (or toggle open registration).

## 7. Ongoing deploys — Mac → GitHub → LXC

Develop on the Mac (`npm run dev` against local Supabase, migrations committed to
`supabase/migrations`), push to GitHub. Then pick ONE path:

**Simple** — pull + rebuild on the LXC:

```bash
# On the LXC:
./deploy/deploy.sh      # git pull → compose up --build → migrate
```

**Nicer** — GitHub Actions builds the image, pushes to GHCR, and SSHes the LXC to
pull + restart + migrate. Use `.github/workflows/deploy.yml`:

1. In `deploy/docker-compose.app.yml`, switch the `app` service from `build:` to
   `image: ghcr.io/makaiview/spectraforge:latest`.
2. Add repo **secrets**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `LXC_SSH_HOST`,
   `LXC_SSH_USER`, `LXC_SSH_KEY`; repo **variable**: `NEXT_PUBLIC_SUPABASE_URL`.
3. Push to `master` — the workflow builds, pushes, and deploys.

Either way, migrations run as a deploy step, so schema changes ship with the code.

### Auto-update (recommended) — release-gated, hands-off

Let the LXC keep itself current from Git with **no inbound ports and no CI
secrets**. It polls GitHub and redeploys when there's a newer **release tag** —
so you control exactly when an update ships (by cutting a release), and
half-finished commits never deploy.

Install the systemd timer **and** the in-app update trigger on the LXC (edit the
`User`/paths in the units first):

```bash
sudo cp deploy/spectraforge-update.service deploy/spectraforge-update.timer \
        deploy/spectraforge-update-trigger.path /etc/systemd/system/
sudoedit /etc/systemd/system/spectraforge-update.service          # set User + repo path
sudoedit /etc/systemd/system/spectraforge-update-trigger.path     # fix PathExists path
sudo systemctl daemon-reload
sudo systemctl enable --now spectraforge-update.timer spectraforge-update-trigger.path
systemctl list-timers spectraforge-update.timer                   # confirm it's scheduled
```

It checks every 10 minutes (`deploy/update.sh`): fetch tags → if the newest
`vX.Y.Z` differs from what's deployed, check it out, rebuild, and migrate. Every
run writes `deploy/state/last-update.json`, which the **Admin Console → Software
updates** panel reads to show the running version and last result.

The `.path` unit lets you update **without SSH**: the panel's **Check for
updates** button drops `deploy/state/update-requested.json` (a bind-mounted dir),
the `.path` unit sees it and fires the updater immediately (forcing a rebuild of
the current release even if there's no newer tag). `_apply.sh` creates
`deploy/state/` (mode 777 so the container's non-root app user can write the
request file) on the first deploy.

**Cut a release** from your Mac (this is what triggers a deploy):

```bash
./scripts/release.sh 0.2.0     # bumps package.json, commits, tags v0.2.0, pushes
```

Within ~10 minutes the LXC picks up `v0.2.0` and redeploys. Watch it with
`journalctl -u spectraforge-update.service -f`.

Prefer continuous deployment (every commit to master, no tags)? Set
`Environment=SF_UPDATE_CHANNEL=edge` in the service unit and `daemon-reload`.
The build-from-source updater and the GHCR Actions pipeline are alternatives —
pick one; don't run both.

## 8. Backups (the calibration/recipe data is the irreplaceable asset)

- **Whole-LXC**: Proxmox `vzdump` on a schedule.
- **Database**: nightly `pg_dump` to your NAS:

  ```bash
  docker exec -t supabase-db pg_dumpall -U postgres | gzip > /mnt/nas/sf/db-$(date +%F).sql.gz
  ```

- **Storage**: sync the Supabase Storage volume (uploaded photos) to the NAS
  nightly (`rsync`/`restic`).

## 9. AI configuration

The AI layer is config-gated. Each user sets **provider / model / base URL / key**
in **Settings → AI & Integrations** — stored in `user_settings` and resolved
server-side (the key never reaches the browser). `OLLAMA_*` in `.env.production`
is only a fallback. With no config, grading uses the built-in heuristic and
suggestions fall back to baselines / mid-range.

To wire Ollama Cloud: in Settings, set provider **Ollama**, base URL
`https://ollama.com`, a vision-capable model id (verify the current cloud
catalog), and your `OLLAMA_API_KEY`.

## 10. Cloud migration (later, optional — §2c)

Everything is behind env vars, so a move is config-only: point
`NEXT_PUBLIC_SUPABASE_URL` / keys at **Supabase Cloud**, or move to **AWS**
(Postgres → RDS, Storage → S3 — the S3-compatible API means upload code is
unchanged), and deploy the same image to ECS/Fargate.

---

## Troubleshooting

- **Caddy can't reach `kong`/`app`** — confirm both are on `sfnet`
  (`docker network inspect sfnet`) and you brought Supabase up with the override.
- **`migrate.sh` can't reach `db:5432`** — the override must attach `db` to
  `sfnet`; re-run the Supabase `up` with `-f supabase-network-override.yml`.
- **Client can't reach Supabase** — `NEXT_PUBLIC_SUPABASE_URL` is baked at *build*
  time. If you change it, rebuild the app image (it's a build arg).
- **`sharp` errors at runtime** — add `RUN npm i sharp` to the Dockerfile `runner`
  stage and rebuild.
- **Studio exposed publicly** — it shouldn't be; the API Caddy block only proxies
  `/auth /rest /storage /realtime /graphql /functions`. Reach Studio on the LAN at
  `http://<lxc-ip>:8000`.
