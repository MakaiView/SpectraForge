# SpectraForge

> **Turn experiments into expertise.** A laser-materials intelligence app — it documents what
> settings work for which materials and helps you dial in new ones with AI. It never drives the laser.

SpectraForge is a self-hosted assistant for laser cutting, engraving, and marking. It captures the
knowledge that usually lives in scattered spreadsheets and muscle memory — *which power/speed/frequency
gets a clean cut on this acrylic, a crisp mark on that coated steel* — and turns each real burn into
data that makes the next one better. A vision model grades your calibration sheets and proposes
settings, but a human is always in the loop: **SpectraForge documents and advises; it does not control
any machine.**

It's built for a real multi-machine workshop (ComMarker UV galvo + Snapmaker diode lasers) and runs
entirely on a private homelab — no cloud lock-in, your data stays yours.

---

## Features

- **Recipes** — a searchable library of proven settings per machine + material + process (cut / engrave
  / mark), with status (draft → calibrated) and provenance.
- **Materials & machines** — model your actual hardware (type, wattage, lens/module, bed size, and the
  real parameter **ranges** that act as safety limits) and your material catalog.
- **Attempts log** — record real burns with the exact settings, input + result photos, and an outcome
  grade (**Great / Possible / Bad / Fail**). Optionally get an **AI diagnosis** of a burn from its
  photos.
- **Calibration Lab** — guided test-grid runs that converge on a recipe:
  - Build a grid from your machine's real ranges (or center it on a manufacturer preset), export the
    axes straight to LightBurn's Material Test, with the held-constant settings called out.
  - **Grade it yourself first**, add a rationale, then **reveal the AI's independent grade** side-by-side
    with an agreement score.
  - **Refine** (a mechanical zoom on your winner) or **AI: next test** — the model reasons about your
    grades, notes, and goal and proposes the next grid, and can switch *which* settings it sweeps.
  - Promote the winning square straight to a recipe.
- **AI assistance, grounded in your data** — starting-point suggestions, sheet grading, next-test
  planning, and attempt advice, all grounded in your own baselines/recipes/attempts and clamped to your
  machine's safe ranges. Works with any Ollama-compatible vision model; degrades to sensible heuristics
  when no model is configured.
- **Manufacturer baselines** — 195 presets transcribed from the ComMarker and Snapmaker docs, filtered
  by machine + lens and grouped by material type.
- **Multi-user & self-hosted** — roles, RLS-scoped data, admin console, and an in-app software-update
  panel. Runs on a Proxmox LXC with self-hosted Supabase; nothing leaves your LAN unless you point the
  AI at a cloud model.

---

## How it works

```
Next.js 15 (App Router, TypeScript, Tailwind)      ← the app: screens + server actions + API routes
        │
        ├── Self-hosted Supabase                    ← Postgres + Auth + Storage + REST, all owner-scoped by RLS
        │      (recipes, attempts, calibration, machines, materials, baselines, per-user settings)
        │
        └── Ollama-compatible vision model          ← grading, suggestions, next-test planning, advice
               (config-gated per user; server-side only; heuristic fallback)
```

- **Data model** — machines carry parameter *ranges* (the safety envelope). A calibration **run**
  (material + goal + context) holds **tests** (grids); each test separates *your* grade (`grid`,
  `best_square`, `rationale`) from the *AI's* grade (`ai_grid`, `ai_best`, `analysis`) so the two stay
  independent. Parameters are type-aware — e.g. a UV galvo leads with **Q-Pulse**, not power.
- **The AI approach** — every AI call is grounded in the user's own data (a lightweight RAG over
  baselines, promoted recipes, and logged attempts) and its output is hard-clamped to the machine's
  configured ranges and valid parameters, so a general model can reason about the *concepts* without
  hallucinating an unsafe number. The API key is resolved server-side and never reaches the browser.
- **The training loop** — because you grade sheets *blind* before revealing the AI's grade, every run
  produces labeled data: *photo + context + settings → your grade + rationale vs. the AI's grade*. That
  pairing (and the agreement score) is the foundation for improving the model over time.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend / server | Next.js 15 (App Router, React 19, TypeScript, Tailwind), **Turbopack** |
| Data & auth | Self-hosted Supabase — Postgres, GoTrue, PostgREST, Storage, Kong |
| Images | `sharp` (EXIF-aware downscale, thumbnails, SVG rasterization) |
| AI | Ollama Cloud (any vision-capable model; config-gated per user) |
| Runtime | Docker (Node 22, standalone output) on a Proxmox LXC |

---

## Getting started (local development)

> You only need this to *run* the app locally. To just edit/fix and ship (the usual flow — see
> **Deployment**), you only need `git clone` + `npm install`.

**Prerequisites:** Node 20+ (Node 23 works — with Turbopack only), Docker, and the Supabase CLI (pinned
as a dev dependency, so the `db:*` scripts work out of the box).

```bash
git clone https://github.com/MakaiView/SpectraForge.git
cd SpectraForge
npm install

# 1. Boot local Supabase (Postgres + Auth + Storage); this also applies the migrations.
npm run db:start

# 2. Create .env.local from the template and fill in the values printed by `db:start`:
#    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
#    plus SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME / SEED_ADMIN_COMPANY
cp .env.example .env.local
$EDITOR .env.local

# 3. Seed the workspace (admin user, 195 baselines, machines, recipes).
npm run db:seed-admin && npm run db:seed-baselines && npm run db:seed-machines && npm run db:seed-recipes

# 4. Run it.
npm run dev            # http://localhost:3000 — sign in with your SEED_ADMIN_* creds
```

The AI is off until you configure it: **Settings → AI & Integrations** (provider, base URL, model,
key). Until then, grading uses the built-in heuristic and suggestions fall back to baselines/mid-range.

**Handy scripts:** `npm run typecheck` (`tsc --noEmit`), `npm run lint`, `npm run db:reset` (re-apply
migrations + reseed), `npm run db:types` (regenerate `types/db.ts` after a migration).

---

## Project structure

```
app/(app)/…        Authed screens: dashboard, recipes, materials, machines, calibration/[id],
                   attempts, review, settings, admin, …
app/api/…          Route handlers (admin, ai/health, photo uploads, auth)
components/…        One folder per domain + ui/ primitives; shell/ is the layout
lib/params/         Parameter + machine-type schema (the backbone)
lib/calibration/    Grid math, grading scale, patterns, categorization
lib/ai/             Config, provider, prompt builders (grade / suggest / next-test / advise), grounding
lib/{auth,storage,images,data,deploy,…}
supabase/migrations/  Ordered SQL migrations
scripts/            Seeds, release.sh, backup.sh
deploy/             Compose files, systemd units, migrate/apply scripts (Dockerfile is at repo root)
design_handoff_spectraforge/BUILD_SPEC.md   Original design spec
```

---

## Deployment

Deploys are release-gated and hands-off:

```bash
./scripts/release.sh 0.1.X       # bumps package.json, tags vX, pushes
```

The homelab runs a systemd timer that pulls the newest release tag within ~10 minutes and rebuilds
(migrations apply automatically), and an in-app **Admin → Software updates** button that triggers the
same update on demand — no SSH required. Nightly backups (DB + Storage files + config) run via a
second timer. Full instructions, including the one-time LXC / Supabase / Caddy setup, are in
[`SETUP_HOMELAB.md`](SETUP_HOMELAB.md).

---

## Documentation

- **[`CLAUDE.md`](CLAUDE.md)** — working context: architecture, conventions, gotchas, current state.
- **[`SETUP_HOMELAB.md`](SETUP_HOMELAB.md)** — provisioning the Proxmox LXC, Supabase, deploy, backups.
- **[`design_handoff_spectraforge/BUILD_SPEC.md`](design_handoff_spectraforge/BUILD_SPEC.md)** — the
  original design spec (code comments reference it as "BUILD_SPEC §N").

---

## Status

Actively developed. Private project for Makai View Media; not accepting external contributions.
