# BUILD_SPEC — SpectraForge

Engineering plan for turning the prototype into a real, self-hosted-first app. This is a **personal build**; optimize for a solo developer and a clean homelab→cloud migration path.

---

## 1. Target stack

- **App framework:** **Next.js (React + TypeScript)** with **Tailwind CSS**. One deployable app; server routes keep all secrets (AI keys, DB) off the client. Recreate each screen as React components using the exact tokens in README (map them to Tailwind theme values / CSS variables; keep the `data-sf` + custom-property theming so Dark/Light/accent switching stays a one-attribute swap).
- **Backend spine:** **Supabase, self-hosted** (Docker) — Postgres + Auth + S3-compatible Storage in one stack you run on Proxmox today.
  - **Postgres** for all relational data (see DATA_MODEL).
  - **Auth** for the single/again multi-user login.
  - **Storage** (S3-compatible) for uploaded photos (material reference, attempt input/result, calibration sheet photos) and generated share-cards. **This replaces the prototype's localStorage image hack** (which is quota-limited and not a real solution).
- **Why Supabase over Firebase:** Firebase is Google-hosted only — it can't run on your Proxmox homelab, which fights the "start self-hosted" goal. Supabase is essentially open-source Firebase: self-host now, and later either move to **Supabase Cloud** or migrate piece-by-piece to AWS (Postgres → RDS; Storage → real S3 — the S3-compatible API means upload code doesn't change).

## 2. Deployment — Proxmox LXC (self-hosted, Option A: full Supabase)

**Decision (owner):** run the **full self-hosted Supabase stack** (Docker Compose) — Postgres + GoTrue Auth + PostgREST + Storage + Studio + Kong — plus the Next.js app, inside a **Proxmox LXC**. This matches §1/§3 verbatim (real Auth + RLS + S3-compatible Storage out of the box).

### 2a. Homelab target architecture
- **LXC container:** unprivileged **Debian 12**, **4 vCPU / 6–8 GB RAM / 40+ GB disk** (the Supabase stack is ~7 services; give it headroom). Supabase's own `docker-compose` prefers a real Docker host, so:
  - Enable LXC **nesting** + **keyctl** (Proxmox → container → Options → Features: `nesting=1`, `keyctl=1`) so Docker runs inside the container. (If you hit permission friction on an unprivileged container, a small **VM** instead of an LXC is a valid fallback — Docker is happier in a VM.)
  - Install Docker Engine + Compose plugin in the container.
- **Two compose stacks (or one network):**
  1. **Supabase** — clone `supabase/docker`, set a strong `.env` (Postgres password, JWT secret, anon/service keys, dashboard creds, SMTP for auth emails). Lock down: do **not** expose Studio/Kong to the internet — keep them LAN-only.
  2. **App** — the Next.js app as its own Docker image, on the same Docker network, talking to Supabase via internal hostnames.
- **Reverse proxy + TLS:** Caddy (simplest auto-TLS) or your existing Nginx Proxy Manager / Traefik in front of the app. For access from outside the LAN without opening inbound ports, use a **Cloudflare Tunnel** (or Tailscale for private-only access).
- **Backups:** Proxmox `vzdump` of the whole LXC on a schedule, **plus** a nightly `pg_dump` and a Storage bucket sync to your NAS — the calibration/recipe data is the irreplaceable asset.
- **Config:** every environment-specific value (Supabase URL + anon/service keys, Storage bucket, Ollama base URL + model + `OLLAMA_API_KEY`, auth/session secrets) lives in env vars / `.env` on the container — never in the repo, never in the client bundle.

### 2b. Dev & deploy workflow (Claude Code on Mac Studio → GitHub → LXC)
The owner develops with **Claude Code on a Mac Studio**, versions in **GitHub**, and deploys to the **homelab LXC** — the LXC does not run Claude Code. Set it up so:
- **Local dev (Mac):** run Supabase locally with the **Supabase CLI** (`supabase start` spins the same stack in Docker Desktop) so dev mirrors prod. `next dev` against the local Supabase. Keep DB schema in **SQL migrations** (`supabase/migrations`) committed to git — never click-configure prod by hand.
- **Version control:** one GitHub repo. Conventional branches/PRs; secrets never committed (`.env` in `.gitignore`, provide `.env.example`). Tag releases.
- **Deploy to LXC — pick one and have Claude Code implement it end-to-end:**
  - **Simple:** on the LXC, `git pull` + `docker compose up -d --build` behind a small deploy script or a systemd unit. Apply DB changes with `supabase db push` / migration runner.
  - **Nicer:** a **GitHub Actions** workflow that builds the image, pushes to **GHCR** (GitHub Container Registry), and triggers the LXC to pull + restart (self-hosted runner, or an SSH/webhook deploy step). Migrations run as a deploy step.
- **Ask Claude Code to produce `SETUP_HOMELAB.md`** — a concrete, copy-pasteable walkthrough for *this* codebase: create the Proxmox LXC, enable nesting, install Docker, bring up the Supabase stack (with the exact env keys), seed the first admin, build/run the app image, wire the reverse proxy + Cloudflare Tunnel, and the ongoing "push from Mac → deploy to LXC" loop. Since Claude Code writes the actual compose files and scripts, it's best positioned to generate the exact commands — have it write this doc as part of the scaffold and keep it current.

### 2c. Cloud migration path (later, optional)
Keep infra behind env vars so a move is config-only: either **Supabase Cloud** (least work — point the app at hosted Supabase) or **AWS** (app on ECS/Fargate or Amplify, Postgres → RDS, Storage → real S3; the S3-compatible API means upload code doesn't change).

## 3. Auth, roles & user management

The prototype ships a **simulated** auth layer (front-end only, localStorage-backed) so the flows and rules are fully specced and clickable. **Replace it with real Supabase Auth — do not port the simulation.** What the prototype establishes, and what the real build must honor:

### 3a. What exists in the prototype (recreate the exact UX)
- **Login gate** — a full-screen branded screen (crystal logo + tagline) with email/password, Enter-to-submit, and explicit error states: *wrong credentials* and *account deactivated*. Rendered as a `position:fixed` overlay shown whenever there's no session; the app sits behind it.
- **Registration** — a "Create account" view (name, email, workspace/company, password) with client validation and auto-login on success. **Gated** by an admin flag (see below).
- **Session** — persisted; on load, an existing valid session skips the gate. Sign-out clears it and returns to the gate.
- **Roles** — every account is `admin` or `member`. The **Admin Console** nav item and the user-menu Admin link render only for admins; members never see admin surfaces. The signed-in user's name/initials/role drive the sidebar avatar + user menu.
- **Admin Console** (admin-only screen) — workspace stats (total / active / admins), a users table with role + status badges, per-user **edit / delete**, quick role + active toggles, a **Create user** modal (name, email, password, role, active), and an **"Open registration" toggle** (off by default).
- **Registration off-switch** — when off, the gate reads "Registration is by invitation only" and hides the sign-up link; only admins create accounts. **This is the intended initial state** (owner doesn't want public sign-up at launch).
- **Self-protection** — you can't delete or disable your own account.

### 3b. What the real build must do
- **Use Supabase Auth** (email/password to start; the same UI maps cleanly to magic-link or OAuth later). Sessions = Supabase JWT, not a localStorage flag.
- **Passwords:** the prototype stores them in plaintext in localStorage — **this is a demo shortcut only.** Real auth hashes server-side (Supabase Auth does this for you; never store or log raw passwords).
- **Roles live in the DB** (see DATA_MODEL `Profile.role`), not the client. Gate admin UI on the server-verified role AND **enforce with Postgres Row-Level Security** — never trust the client for authorization. Hiding the nav item is UX, not security; every admin API route must re-check the caller is an admin.
- **Registration flag** is a server-side workspace setting (DATA_MODEL `WorkspaceSettings.registration_open`), read by the gate and enforced by the sign-up route — a closed flag must **reject sign-up server-side**, not just hide the link.
- **Admin user management** (create / edit / disable / delete, role changes) runs through admin-only server routes using the Supabase service role. Disabling = an `active=false` flag the login path rejects (or use Supabase's ban/disable).
- **Seed the first admin** outside the sign-up path (a migration or one-time setup route), since registration ships closed — otherwise no one can get in.

## 4. Media & image handling (uploads + the Ollama-cloud vision path)

The prototype fakes image upload with base64 in localStorage — quota-limited and not real. Replace it with proper object storage, and mind one homelab-specific gotcha: **Ollama Cloud is an external service and cannot reach images stored privately on your homelab.**

### 4a. Upload & storage
- **Store in Supabase Storage** (S3-compatible), one **private** bucket per kind: `attempt-photos`, `material-photos`, `recipe-photos`, `calibration-photos`, `share-cards`. RLS on storage so users only reach their workspace's objects.
- **The DB stores the object path/ref, never the bytes** (see DATA_MODEL — attempts hold `inputImg`/`resultImg` refs, etc.). Records point at storage keys.
- **Upload flow:** client → Next.js server route (or a Supabase **signed upload URL** for direct-to-storage on large files) → object saved → path written on the record. 
- **Process on ingest:** honor **EXIF orientation** (phone photos arrive rotated), **downscale + compress** to a sane max (long edge ~1600px, JPEG/WebP) for the stored original, and generate a **thumbnail** for list rows/cards. This keeps Storage small and display fast.
- **Display:** private buckets → short-lived **signed URLs**, rendered as real `<img src>` (never a data-URL inside a `style` string — see §8).

### 4b. Feeding photos to the vision model (the important part)
Ollama Cloud runs **off your network**. It therefore **cannot fetch a LAN/private URL** to your homelab Storage. Do **not** try to hand it a Supabase Storage URL. Instead:
- **Server-side, base64-inline the bytes.** The Next.js server route: pull the object from Storage → **downscale specifically for the model** (vision models don't need full res; ~1024–1568px long edge is plenty and cuts latency/cost) → base64-encode → include in the Ollama API call's `images` array alongside the prompt. The image never leaves your server except inside the model request.
- **Why not a public signed URL:** it would require exposing that object to the public internet (via the Cloudflare Tunnel) for the model to fetch — more surface area, more moving parts, and it leaks workshop photos. Base64-inline keeps buckets private. Prefer it.
- **Payload discipline:** resize before encoding, send one (or few) images per call, and set sane request timeouts — grid photos can be large off a phone.
- This is the same server route described in §5; images are just one part of that request body.

## 5. AI architecture (the most important net-new work)

**Current state of the prototype:** there are **no real AI calls anywhere**. Every "AI" surface is a local heuristic:
- Settings → AI & Integrations collects provider/model/key/base-URL but **never uses them**.
- Calibration "AI grade this sheet" runs a heuristic from the machine ranges + goal and **ignores the uploaded photo's pixels**.
- Calibration analysis headline/write-up is templated text.

**Build it for real, server-side.** Never call the model from the browser — route through a Next.js server route so the key stays secret and the model is swappable.

### 5a. Provider: Ollama Cloud (per the owner)
- Use Ollama's **cloud** models (flat-rate usage rather than per-token like the big API vendors). Talk to it from the server route via the Ollama API using `OLLAMA_API_KEY` + base URL from config.
- **Model-agnostic by design:** the model name is ONE config value. Ollama rotates its cloud catalog, so never hardcode a model in logic. Verify the current cloud catalog when wiring.
- **Requirements for the chosen model:** **vision** (grade sheet photos), strong **reasoning** + **tool/function-calling** (build settings, return structured JSON), and **long context** (fit machine specs + retrieved knowledge). Start with one vision-capable cloud model for grading; optionally route text-only settings reasoning to a large reasoning model. Categories to look at in the cloud catalog: the Qwen-VL / MiniMax-class vision models and the large open reasoning models (e.g. the gpt-oss 120B cloud tag) for text-only tasks.

### 5b. The knowledge problem (critical — do not skip)
**No open model has reliable per-brand/per-machine laser knowledge in its weights.** A general model understands the *concepts* (power, speed, frequency, Q-pulse, interval, air assist, rotary, and CO₂/diode/UV/fiber/MOPA behavior and how they interact) but will **hallucinate** specific numbers for a specific machine on a specific material. Solve with architecture, not model choice:

1. **RAG** — retrieve from a knowledge base before generating: manufacturer material/settings tables, the user's own promoted recipes, logged attempts, and any community data. Ground every suggestion in retrieved facts. Store embeddings in Postgres (`pgvector`, available in Supabase).
2. **Hard constraints** — every machine already declares its parameter ranges (see DATA_MODEL `ranges` + `TYPE_PARAMS`). Pass them as guardrails and **clamp** any generated setting to what the machine can physically do, and to only the parameters that machine type exposes (UV has no Power %, etc.).
3. **Structured output** — force JSON (per-cell grades for a grid; a parameter set for a suggestion) and validate against the known grid geometry / param schema before showing it.

### 5c. AI touchpoints to implement
- **Photo grading (killer feature):** send the calibration sheet photo + grid geometry (rows/cols, axis params + values) to the vision model; get per-cell grades (clean/partial/fail) back as JSON; overlay on the grid. Replaces the current heuristic.
- **Suggested starting settings:** given material + machine + goal, propose a starting recipe / grid center. RAG + hard constraints.
- **Grid analysis:** real write-up of what the graded grid shows and what to refine next.
- **Attempt diagnosis:** "why did this char / not cut through?" from settings + outcome + photos.
- **Natural-language search** across recipes/materials/machines (optional, later).

### 5d. The data flywheel (the real moat)
The app is a **training-data factory**. Every graded calibration sheet = a labeled example (*photo + human grade + exact settings + material + machine*). Persist these cleanly. Near-term they power RAG / few-shot exemplars; once enough accumulate, they become a **fine-tune set** for an open vision model (Qwen2-VL / LLaVA-class) run on the homelab GPU — a specialized laser-sheet grader nobody else has. Design the calibration schema so this dataset is a clean byproduct of normal use (see DATA_MODEL — `CalibrationTest` / grid cells store photo ref + settings + grade).

## 6. Seed presets (owner-provided)

The owner can provide **default/starting settings** to seed the knowledge base and the calibration baselines for:
- **ComMarker Omni XE** — for **both the 70 mm and 150 mm lenses** (treat lens as part of the machine/preset identity — different lens = different working area + effective ranges).
- **Snapmaker** — the **2W** and the **10W** diode modules.

These become **manufacturer baselines** the Calibration Lab can center its first grid on, and the grounding facts the AI works from + refines with the user. **The exact numbers are owner-supplied** (either from data given earlier in the design conversation or handed to you directly during the build) — do **not** invent them. Model them as `MachineBaseline` / preset records (see DATA_MODEL): keyed by machine + lens/module + material + process, holding the starting parameter values within that machine's ranges. Build an import path so the owner can paste/upload these tables.

## 7. Build order (suggested)
1. Scaffold Next.js + Tailwind + Supabase (self-hosted); wire the token system + Dark/Light/accent theming. Set up **auth + roles + RLS** and seed the first admin; build the login gate, gated registration, and the Admin Console (users + registration toggle).
2. Data layer + schema (DATA_MODEL) with the **parameter-schema system** (`PARAM_DEFS` / `TYPE_PARAMS`) as the backbone — many screens depend on it.
3. CRUD screens: Machines (+ ranges + add-ons), Materials (+ managed categories), Recipes.
4. Attempts with real photo upload to Storage (see §4); view/edit/lightbox; share-card generation (server-side canvas or a rendering lib).
5. Calibration Lab engine: run objects, adaptive wizard, grid builder from ranges, grading, refine/promote → recipe with provenance.
6. AI server routes (§5) + media/vision path (§4): photo grading first (highest value), then suggestions/analysis/diagnosis; RAG + constraints; seed the owner's presets.
7. Onboarding, Settings (incl. real AI config), Tools, Help.

## 8. Watch-outs carried over from the prototype
- **Auth is simulated** — the prototype's plaintext-password / localStorage session is a demo stand-in; the real build must use Supabase Auth + hashed passwords + RLS (see §3). Never ship the simulation.
- **Never** bind an image data-URL inside a `style` string — the `;base64,` truncates it. Use real `<img>`/element `src`.
- **Don't** transition CSS properties whose value comes from a theme-swapped custom property (caused a Chrome render "wedge"); keep theme swaps instant.
- Calibration axis values must stay **round** (nice numbers) so they're usable in LightBurn — keep the round-guard/snap behavior.
- Enforce **type-aware parameters everywhere** (machine detail, recipe, attempt, calibration): a parameter that a machine type doesn't expose must not appear or be gradeable.
