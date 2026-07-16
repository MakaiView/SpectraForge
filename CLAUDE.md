# SpectraForge — project context for Claude Code

**What it is:** a laser-materials *intelligence* app — documentation + AI guidance for dialing
in laser settings per material. It records recipes, logs real burn attempts, runs guided
calibration test grids, and uses a vision model to grade sheets and suggest settings. **It never
drives the laser** — it's a knowledge/assistant tool, human-in-the-loop.

The original design + intent lives in `design_handoff_spectraforge/BUILD_SPEC.md` (code comments
cite it as "BUILD_SPEC §N"). This file is the working context; BUILD_SPEC is the spec.

## Stack
- **Next.js 15** (App Router, TypeScript, Tailwind). **Turbopack** for dev *and* local build
  (`next dev --turbopack` / `next build --turbopack`).
- **Self-hosted Supabase** (Postgres + GoTrue auth + PostgREST + Storage + Kong gateway). RLS on
  everything, owner-scoped by `owner_id default auth.uid()`.
- **AI:** Ollama Cloud (config-gated; the owner uses `qwen3.5:397b-cloud`, a vision model).
- Node 22 in the production Docker image (webpack build there); local dev is fine on Node 23 **only
  with Turbopack** (Node 23 + webpack has a bug — see Gotchas).

## Local dev
Needs Docker + the `supabase` CLI (pinned as a dev dependency).
```bash
npm install
npm run db:start                 # supabase start — boots local Postgres/Auth/Storage, applies migrations
# copy .env.example → .env.local and fill NEXT_PUBLIC_SUPABASE_URL / ANON / SERVICE_ROLE
# from the `supabase start` output, plus SEED_ADMIN_* (e.g. steve@makaiview.dev / spectra-dev)
npm run db:seed-admin && npm run db:seed-baselines && npm run db:seed-machines && npm run db:seed-recipes
npm run dev                      # http://localhost:3000
```
Other scripts: `db:reset` (re-apply migrations + wipe), `db:types` (regenerate `types/db.ts` from the
live local schema — **run this after every migration**). Env vars (all in `.env.example`; real values
are gitignored): `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only),
`SEED_ADMIN_*`, `OLLAMA_BASE_URL/API_KEY/MODEL` (fallback only — real AI config is per-user in the DB).

Local Supabase container names are suffixed `_SpectraForge` (e.g. `supabase_db_SpectraForge`); the
homelab uses the standard `supabase-db` / `supabase-storage`.

## Repo map
- `app/(app)/*` — authed screens: dashboard, recipes, materials, machines, calibration (`/[id]` = run
  wizard), attempts, review, favorites, tools, settings, profile, admin, help. `app/(auth)/login`.
- `app/api/*` — route handlers: `admin/{users,registration,update}`, `ai/health`, `attempts/[id]/photo`,
  `calibration/tests/[id]/photo`, `auth/register`.
- `lib/params/schema.ts` — **the backbone.** `PARAM_DEFS`, `TYPE_PARAMS`, `MACHINE_TYPES`, `ADDONS`,
  `formatParam`. Machine types: `co2 | fiber | diode | uv | ir`. Params per type, e.g.
  `uv: [qpulse, speed, freq, interval, passes]` — **UV has NO power %** (it leads with `qpulse`).
- `lib/calibration/*` — `constants.ts` (GOALS, PATTERNS, `patternAxisKeys`, `primaryParam`,
  `patternLabel`, EXTENSIBLE_PARAMS/HARD_CAP), `engine.ts` (axes/grid math, heuristic grader,
  `refineAxes`), `grades.ts` (the 4-level scale — single source of truth), `categorize.ts` (baseline
  material → section).
- `lib/ai/*` — `config.ts` (`resolveAiConfig`, `isAiConfigured`), `provider.ts` (`chat`, `extractJson`),
  `grade.ts`, `suggest.ts`, `nexttest.ts`, `advise.ts` (prompt builders + parsers), `grounding.ts`
  (RAG-lite), `context.ts` (`machineContext`), `constraints.ts` (`clampParams`).
- `lib/{auth,storage,images,data,deploy,supabase,theme}` — sessions/RLS guards, signed-URL helpers,
  sharp processing, option loaders, deploy-state paths.
- `components/*` — one dir per domain; `ui/` has shared primitives (Badge, Modal). `shell/AppShell.tsx`
  is the layout.
- `supabase/migrations/00NN_*.sql` — schema, in order. `scripts/*` — seeds + `release.sh` + `backup.sh`.
- `deploy/*` — Dockerfile lives at repo root; compose files, systemd units, migrate/apply scripts here.

## Domain model
- **Machines** — `type`, `watts`, `lens` (module id, e.g. "70mm"/"10W"), `bed_w/h`, `ranges` (jsonb
  `{param: {min,max}}` — the safety envelope), `addons`. Owner's real machines: 2× ComMarker Omni XE
  UV galvo (70mm + 150mm lenses), 2× Snapmaker diode (10W + 1600mW) on an A350.
- **Recipes** — a saved setting set for a machine+material+process, with a status (draft/cal/review).
- **Attempts** — a logged real burn: params, `outcome` (Great/Possible/Bad/Fail — see scale below),
  input+result photos, note, optional `ai_advice` (jsonb).
- **Calibration** — `runs` (material, goal, machine, free-text `context`) → `tests` (a grid). A test
  has swept `axes` (x + y), held `statics`, the human `grid` + `best_square` + `rationale`, the AI's
  `ai_grid` + `ai_best` + `analysis`, and `ai_plan` (why an AI-suggested test exists). Patterns pick
  which 2 params sweep; **Y axis is always the primary energy param** (power, or qpulse for UV).
- **machine_baselines** — 195 manufacturer presets transcribed from PDFs (ComMarker + Snapmaker).
  **Never invent these numbers** (BUILD_SPEC §6) — transcribe from source only.
- **The 4-level result scale** (`lib/calibration/grades.ts`, used by calibration cells AND attempt
  outcomes): **Great** ✓ green · **Possible** ~ blue · **Bad** ! amber · **Fail** ✕ red (Fail =
  destroyed the material OR barely marked). Legacy `clean/partial/fail` normalize to it on read.

## AI architecture
Config-gated, **server-only** (the api key never reaches the browser). `resolveAiConfig()` reads
`user_settings` (per-user provider/model/base_url/key), falling back to `OLLAMA_*` env. `chat()` hits
`${baseUrl}/api/chat` with `Authorization: Bearer`, base64 `images`, `format: json`. Every AI feature
has a heuristic/deterministic fallback when unconfigured. Touchpoints:
- **Suggest starting point** (New Calibration modal) — grounded in baselines/recipes/attempts.
- **Grade sheet** (Run Wizard) — vision; writes `ai_grid`/`ai_best` **separately** from the human grade.
- **AI next-test** (Run Wizard) — reasons about the human grades + rationale + context, proposes the
  next grid (may sweep different params), re-clamped to machine ranges. Distinct from mechanical Refine.
- **Attempt advice** — diagnoses a logged burn from its photos + settings.
- Prompts always include machine identity (`machineContext` — make/model/type/W/lens), material, and
  the run context. Model output is clamped to the machine's ranges + type-valid params (`clampParams`).
- **Training loop:** grading is done **blind** (you grade first, then Reveal AI) so `grid` vs `ai_grid`
  + your `rationale` are independent labeled data; the wizard shows an agreement score.

## Conventions & gotchas
- **RLS everywhere**, owner-scoped. Server actions live in `app/(app)/*/actions.ts`; admin routes call
  `requireAdmin()`.
- **Turbopack is required** for dev/local build (Node 23 + webpack bug). Docker build uses Node 22 +
  standard webpack. `next.config.mjs` sets `output: standalone`, and ignores eslint/ts errors *in the
  image build only* (keeps the resource-constrained LXC build fast). Authed pages + login are
  `export const dynamic = "force-dynamic"` so `next build` doesn't try to prerender data-fetching routes.
- **`@supabase/ssr` must be `^0.12`.** Font is **Hanken Grotesk** (not IBM Plex). 4-accent palette.
- After any migration: apply it, then `npm run db:types` and commit the regenerated `types/db.ts`.
  jsonb columns come back as `Json` — cast at the boundary.
- Param labels are **type-aware** — never hardcode "Power"; derive from the machine's params
  (`patternLabel`, `PARAM_DEFS`). UV shows "Q-Pulse", not "Power".
- Secrets: `.gitignore` ignores `.env` + `.env.*` except the `*.example` templates. `.env.local`
  (dev) and `.env.production` (LXC) are untracked. `deploy/state/*` is runtime-only (gitkeep only).
- Commit/push and cut releases only when asked.

## Deploy & homelab
- **Release:** `./scripts/release.sh 0.1.X` bumps `package.json`, commits, tags `v0.1.X`, pushes.
- **Homelab:** Proxmox LXC at `http://10.10.5.152:3000` (LAN-only), repo at `/root/SpectraForge`, runs
  the **LAN** compose (`deploy/docker-compose.lan.yml`; app on :3000, no Caddy). A systemd timer
  auto-pulls the newest release tag within ~10 min and rebuilds; a `.path` unit + the in-app
  **Admin → Software updates → Check for updates** button trigger it on demand. Migrations auto-apply
  on deploy (`deploy/migrate.sh`, idempotent). `SF_COMPOSE_FILE=deploy/docker-compose.lan.yml` must be
  set for manual `./deploy/update.sh` runs or `_apply.sh` defaults to the wrong (Caddy) stack.
- Backups: `scripts/backup.sh` (pg_dumpall + Storage files + config) via `spectraforge-backup.timer`.
  Full setup in `SETUP_HOMELAB.md`.
- **Direct SSH deploy works only from a machine whose key is authorized on the LXC** (the Mac Studio
  is; a fresh laptop is not until `ssh-copy-id root@10.10.5.152`). Otherwise use the in-app button.

## Current state (v0.1.17, deployed & live)
All of the owner's recent asks are done and on the homelab, with the Ollama Cloud vision model live:
- Great/Possible/Bad/Fail scale (calibration + attempts); type-aware terminology.
- Calibration hard-clamps to machine ranges (edge-flag suggests widening in Settings); "set once"
  static-params panel; delete runs.
- New-calibration **context** box; **blind-grade → reveal & compare** training capture (rationale +
  agreement score, human vs AI grades stored separately).
- **AI next-test** (reasons about grades + rationale + context, can change swept params) alongside the
  mechanical zoom Refine.
- Earlier: config-gated AI, attempt advisor, in-app software-update panel, mobile layout fixes, SVG
  uploads + mobile camera/photo/file picker, sidebar AI status pill, machine-filtered + sectioned
  preset dropdown.

### Likely next threads
- Tune the grade + next-test prompts against real `qwen3.5:397b` output.
- AI next-test currently keeps the primary energy param (power/qpulse) as one axis; a fully-arbitrary
  two-param sweep would be a further extension.
- Optional/deferred: GHCR build pipeline (offload builds off the LXC), regenerate Supabase JWT keys
  before any off-LAN exposure.
