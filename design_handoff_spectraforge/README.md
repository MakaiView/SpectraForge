# Handoff: SpectraForge — Laser Materials Intelligence App

## Overview
**SpectraForge** is a laser-materials intelligence app for hobbyist and pro laser operators. It is a **documentation + AI-guidance tool, not a hardware controller** — it never drives the laser. Its job is to help an operator:

- Keep a library of **machines** (each laser + its add-ons and physical parameter ranges).
- Keep a library of **materials** (stock, hazards, safe ranges).
- Keep **recipes** (a proven set of settings for a material + machine + process).
- Run the **Calibration Lab** — a guided, iterative test-grid workflow that dials in settings for a new material and promotes the winning square into a recipe.
- Log **attempts** (real burns, with input/result photos) to refine recipes over time.
- Get **AI guidance** — suggested starting settings, photo-based grading of test grids, and failure diagnosis.
- Support **multiple users with roles** — an admin manages accounts and controls whether public registration is open (see Admin Console; auth is simulated in the prototype, real Supabase Auth in the build).

The through-line tagline is **"Turn experiments into expertise."**

## About the design files
The files in `design/` are **design references created in HTML** — a high-fidelity, fully-interactive prototype showing the intended look, structure, and behavior. **They are not production code to copy directly.**

They are authored as a "Design Component" (`.dc.html`) — a single-file format with an inline HTML template plus a `class Component` logic block, rendered by the bundled `support.js` runtime. **Do not port the `.dc.html` format or `support.js` into the real app.** Instead, **recreate these designs in a real codebase** (recommended stack in `BUILD_SPEC.md`) using its own component and state patterns. All application data in the prototype is in-memory seed data + `localStorage`; the real app replaces that with a proper backend (see `BUILD_SPEC.md` and `DATA_MODEL.md`).

To view the prototype: open `design/SpectraForge v2.dc.html` in a browser (it loads `support.js` and `image-slot.js` from the same folder). `design/SpectraForge Logo Concepts.dc.html` holds the logo exploration; the **chosen logo** is the faceted crystal + spectrum-fan mark used in the app header (concept "2a").

## Fidelity
**High-fidelity.** Colors, typography, spacing, layout, interactions, empty/loading/error states, and responsive behavior are all final and intended. Recreate the UI faithfully — the exact design tokens are in the "Design Tokens" section below and every screen is specified. Where the prototype fakes a backend behavior (AI, persistence), that is called out explicitly; implement it for real.

## Reading order
1. **This README** — product, screens, tokens, interactions.
2. **BUILD_SPEC.md** — target stack, deployment (Proxmox LXC + self-hosted Supabase, Mac→GitHub→homelab workflow), **auth/roles/access (§3)**, **media & the Ollama-cloud vision path (§4)**, the AI architecture (the most important net-new engineering, §5), and seed presets.
3. **DATA_MODEL.md** — entities, fields, relationships, and the parameter-schema system that drives everything.

---

## Screens / Views

The app is a persistent **left sidebar + top bar + scrolling content** shell. The sidebar groups navigation into **WORKSPACE** (Dashboard), **LIBRARY** (Recipes, Materials, Machines), **ACTIVITY** (Calibration, Attempts), **COLLECTIONS** (Favorites, Needs Review), **UTILITIES** (Tools), and — **for admins only** — **ADMIN** (Admin Console). The whole shell sits behind an **auth gate**: no session → the login/register screen; signed in → the app.

### Auth — Login / Register gate
- **Purpose:** authenticate before the app is usable. (Prototype simulates this front-end; real build = Supabase Auth — see BUILD_SPEC §3.)
- **Login:** full-screen branded gate (crystal logo + "Turn experiments into expertise"), centered card with email + password, Enter-to-submit, "Sign in" button. Error states for wrong credentials and deactivated accounts (inline red banner). Footer © line.
- **Register:** "Create account" view (name, email, workspace/company, password) with validation, auto-login on success. **Only reachable when an admin has enabled registration** — otherwise the gate shows "Registration is by invitation only" and no sign-up link.
- Session persists; a valid session skips the gate on load.libration Lab, Attempts), **COLLECTIONS** (Favorites, Needs Review), **UTILITIES** (Tools), plus a footer with Settings, an **active-machine switcher**, and a user menu. Below 860px the sidebar collapses into a slide-in drawer with a hamburger in the top bar.

### Shell — Sidebar
- **Purpose:** primary nav + active-machine context.
- **Layout:** fixed 244px column, `background: --sf-surface`, right border `--sf-line`. Logo lockup at top (72px tall row), scrollable nav in the middle, footer pinned at bottom.
- **Components:**
  - **Logo lockup:** faceted crystal SVG (≈50×35) + wordmark "Spectra" (`--sf-text`) / "Forge" (`#f5872f`) in Sora 700, with a JetBrains-Mono micro-tagline "TURN EXPERIMENTS / INTO EXPERTISE" at 8px, `--sf-text-3`.
  - **Group labels:** JetBrains Mono, 9px, letter-spacing .18em, `--sf-text-3`.
  - **Nav items:** icon (18px, stroke `currentColor`) + label. Active item: `background: --sf-surface-3`, weight 600, accent text. Idle: transparent, `--sf-text-2`. Hover: `--sf-surface-2`.
  - **Active-machine switcher:** button showing "ACTIVE MACHINE" micro-label + current machine name + a type-colored dot; opens a popover listing all machines (type dot, checkmark on active), plus "Machine settings" and "New machine" actions.
  - **User button:** avatar circle (initials) + name + role/plan ("Admin · Pro" / "Member · Pro"), all **driven by the signed-in user**; opens a menu with Profile, an **Admin Console** link (admins only), plan badge, and **Sign out** (returns to the login gate).

### Shell — Top bar
- **Purpose:** page title + global actions.
- **Layout:** 72px tall, bottom border `--sf-line`, flex row.
- **Components:** kicker (section, JetBrains Mono 10px) + page title (Sora ~22px); a **global search** input (recipes / materials / machines, live results dropdown); a **theme toggle** (sun/moon); a **Calibrate** button; a primary **+ New recipe** button (accent fill).

### Dashboard
- **Purpose:** at-a-glance status + quick entry.
- **Layout:** max-width ~1240px, centered, 30–32px padding. Greeting header, a 5-up **metric strip**, then a 2-column grid (`1.x fr / 1 fr`, collapses to 1col ≤1080px): "Recent activity" list + right rail with "Needs review" and an "Ask AI guidance" panel and a machines mini-list.
- **Components:**
  - **Greeting:** "Good {morning/afternoon/evening}, {firstName}" (Sora 30px 700) + tagline subline.
  - **Metric cards:** RECIPES (248), MATERIALS (36), CALIBRATION RATE (82%), NEEDS REVIEW (7), ATTEMPTS LOGGED (1,204). Each: mono kicker label + large value (Sora). *(These counts are illustrative seed values — wire to real aggregates.)*
  - **Recent activity rows:** icon tile + material name + mono param summary + status badge (CALIBRATED/REVIEW) + relative time. Row click → Attempts.
  - **Needs review** rows and an **AI guidance** call-to-action card (accent-tinted).

### Recipes — list
- **Purpose:** browse/filter documented settings.
- **Layout:** header (title + "N shown" + "New recipe"), a filter row (process chips: ALL/CUT/ENGRAVE/MARK + status chips: ANY/CALIBRATED/REVIEW/DRAFT), then a card containing rows.
- **Row:** favorite star (26px) · icon tile (38px) · **name block** (material name in 14px 600 + `process · machine · thickness` subline in mono 11px `--sf-text-3`; name block has `min-width:120px` and ellipsizes) · **param text** (mono 12.5px, shrinks/ellipsizes, max-width ~270px) · attempts count (mono, 62px right-aligned) · status badge · chevron. Row click → detail.

### Recipe — detail
- **Purpose:** full recipe with provenance and history.
- **Layout:** back link + header (material · name, status badge, **Share** button); a 2-col grid: LEFT = big parameter readout (each param as a labeled value tile, type-aware — see DATA_MODEL) + notes; RIGHT = metadata (machine, material grade, hazards, verified-by), a photo slot, and a **provenance chip** ("⟿ Calibrated in the Lab · N test grids →") when the recipe was promoted from a calibration run (click → the run).
- **Share** opens a modal with a branded, theme-aware **recipe card** image (canvas-rendered) + "Copy settings as text".

### Materials — list & detail
- **List row:** icon tile · name (14px 600) + `category · grade` subline · thickness · "N recipes" · hazard badge (LOW HAZARD/MEDIUM/HIGH) · chevron.
- **Detail:** header (name, hazard) + safe-range / hazard / grade info, a documented-recipes sub-list, notes, and a reference photo slot.
- **Category is a fixed dropdown** sourced from a user-managed list in Settings (not free text) — see below and DATA_MODEL.

### Machines — list & detail
- **List row:** icon tile · name + **type chip** (CO₂/Fiber/Diode/UV/IR-MOPA, each color-coded) · manufacturer/model · `type · watts · bedW×bedH` · add-on count · recipe count · chevron.
- **Detail:** header + the machine's **parameter ranges** rendered **from its type schema** (e.g. a UV machine shows Q-Pulse / Speed / Frequency / Interval / Passes and **no Power %**; a CO₂ shows Power / Speed / Passes / Resolution), add-on chips, and a **Calibrate** entry point.
- **Add/Edit machine modal:** identity fields (name, manufacturer, model, watts, bed W×H), a **type selector** that swaps which range fields appear, per-parameter min/max inputs (Passes is a single max), and add-on toggles.

### Calibration Lab (the core feature — see BUILD_SPEC & DATA_MODEL for the full engine)
- **Run list:** each run is a **saved, resumable object** (in-progress / promoted) showing material · goal · machine · test count · date.
- **Guided wizard** with an **adaptive stepper**: `Setup · Test 1 · Test 2 · … · Promote`. Each graded test that gets refined appends the next Test node. Clicking a past node shows it **read-only** ("Back to current" returns).
  - **Setup:** material (dropdown), goal (expanded set — cut / surface engrave / deep engrave / photo / mark / color-anneal / coating removal / minimal char), and an optional **manufacturer baseline** (seed presets) to center the first grid on.
  - **Configure (auto-built, editable):** picks a **test pattern** (Power×Speed, Interval/DPI, Frequency/Q-Pulse, Multi-pass) and builds a grid whose axes come from the **machine's real parameter ranges**, centered on the baseline/previous best. Axis values are held to "nice" round numbers (a round-guard warns + offers "Make round"). A **LightBurn handoff** step maps the grid to X/Y Min/Max/Cols for the Material Test wizard. Non-applicable params for the type are dimmed.
  - **Grade:** the test grid (default 5×5). Click a cell to select; click again to cycle its grade (clean → partial → fail). Upload a **photo of the burned sheet** and "AI grade this sheet" (currently simulated — must call a vision model for real). A ★ marks the recommended square for the goal.
  - **Analyze:** heuristic (→ real AI) headline + write-up of what the grid shows, a **history table** of all tests with each test's best square, then **Refine** (builds the next finer test centered on the winner) or **Promote**.
  - **Promote modal:** pre-selects the recommended square; "Create recipe" prefills the New Recipe form with the winning parameters + machine + material + goal→process, and stamps provenance back onto the recipe.

### Attempts — list, view modal, edit modal
- **List row:** date · **input/result photo thumbnails** · material · process · machine · outcome badge · note. Row click → view modal.
- **View modal (read-only):** header (process/machine/outcome), input + result photo tiles (click to open a **lightbox**), the full type-aware settings grid, accessory chips, note, an **Edit** button and **Share** (branded attempt card, same card system as recipes).
- **New/Edit attempt modal:** material + machine selects, process segmented control, **type-aware parameter fields**, outcome segmented control, note, and two **photo upload zones** (input / result).

### Tools (bench calculators)
Tabs: **Length** (in/mm/cm), **Temp** (°C/°F), **Rotary** (Diameter ⇄ Circumference + a wrap/section planner using focus tolerance & overlap), **DPI ↔ mm**, **Run-time** (distance ÷ speed). Live-computed results in a mono readout.

### Settings
- **Appearance:** Theme (Dark/Light cards) and **Accent** ("the beam") — curated swatches (Azure default, Electric, etc.).
- **AI & Integrations:** provider picker (Anthropic / OpenAI / Google / **Ollama**), model dropdown (swaps per provider), API key, and base-URL (shown for Ollama). *(Prototype stores these but makes no calls — implement for real, server-side; see BUILD_SPEC.)*
- **Material Categories:** the managed list that feeds the material category dropdown (add/remove).
- **Notifications** toggles. Most preference changes **auto-save** with a "Saved ✓" toast; create/edit flows use explicit Save buttons.

### Profile, Help, Onboarding
- **Profile:** user identity (name, company/studio), plan.
- **Help & Docs:** hero + guidance content; a floating "?" button opens it.
- **First-run onboarding:** a 3-step welcome modal (Welcome → Start with your machine → Calibrate, log, refine), gated by a first-run flag; replayable.

### Admin Console (admin-only)
- **Purpose:** manage user accounts, roles, and registration access. Reachable only for `admin` accounts (sidebar ADMIN group + user-menu link); members never see it. **In the real build, gate on the server-verified role + RLS — hiding the nav is UX, not security (BUILD_SPEC §3).**
- **Layout:** max-width ~1000px. Header, a 3-up stat strip (**Total users / Active / Admins**), a **registration toggle** card ("Open registration", off by default), then a **user accounts** table.
- **User table row:** avatar (initials, dimmed if disabled) · name (+ "YOU" badge on self) · email · **role badge** (Admin/Member) · **status badge** (Active/Disabled) · edit + delete actions. Delete is hidden on your own row.
- **Create user modal:** name, email, company, password (with "set initial password" hint), role segmented (Member/Admin), Account-active toggle; validation + inline errors.
- **Rules:** can't delete or disable your own account; duplicate emails rejected; passwords ≥ 4 chars (demo rule — real build uses Supabase Auth).

---

## Interactions & Behavior
- **Navigation:** SPA screen switching via sidebar; navigating to a section resets its sub-view (e.g. Machines always lands on the list, not the last detail).
- **Theme:** dark default; toggle persists. Theme is applied via a `data-sf` attribute on the root that swaps CSS custom properties. **Note:** transitions must NOT animate any property whose value resolves through a CSS custom property that changes on theme/nav switch (color, custom-prop-driven backgrounds) — in the prototype this caused a Chrome "wedge" and those transitions were removed. Keep instantaneous theme swaps.
- **Accent:** a single accent color ("the beam") marks active/calibrated state app-wide; user-selectable, persists.
- **Machine context:** the active-machine switcher sets the machine used to prefill new recipes/attempts and to derive calibration grid axes.
- **Motion:** buttons transition background/border/color/shadow ~.15s and nudge 1px on active. A subtle "beam" keyframe sweeps the AI panel.
- **Persistence (prototype):** theme, accent, onboarding flag, and uploaded images in `localStorage`; everything else is in-memory seed. **Replace with the real backend.**
- **Images:** drag-drop/upload zones; in the prototype images are data-URLs in `localStorage` (~5MB quota — a real limitation). The real app must use object storage. Note the canvas share-cards render photos **contained** (letterboxed), not cropped, and image `src` must be bound as a real `<img>`/element, never interpolated into a `style` string (a data-URL's `;base64,` truncates the style).
- **Responsive:** ≤1080px two-column grids collapse to one; ≤860px sidebar → drawer with hamburger + overlay.

## State Management
Prototype holds one big component state. In the real app, model these domains (see DATA_MODEL for fields):
- **Session/UI:** auth session (current user + role), current screen + per-section sub-view/selected id, theme, accent, active machine id, open modal, drawer/menu/switcher open flags, onboarding flag, "saved" toast.
- **Data (→ server):** users/profiles (role, active), workspace settings (registration_open), machines, materials, material categories, recipes, attempts (with photos), calibration runs (with tests, grids, grades, chosen squares), user profile + settings (incl. AI provider config).
- **Derived:** type-aware parameter field lists (from `TYPE_PARAMS`), calibration grid axes (from machine ranges + pattern + baseline), recommended square, provenance links.

## Design Tokens

**Fonts** (Google Fonts): **Sora** (display/headings, 700), **IBM Plex Sans** (body/UI), **JetBrains Mono** (labels, params, kickers — uppercase, letter-spaced).

**Color — Dark (default), applied on `[data-sf]`:**
- bg `#0d1016` · surface `#141a24` · surface-2 `#1b2330` · surface-3 `#232d3d`
- line `#222b39` · line-strong `#313d4f`
- text `#eef2f8` · text-2 `#a7b3c5` · text-3 `#69768a`
- grid overlay `rgba(125,145,180,.05)`
- accent `#3f97ff` · accent-strong `#67adff` · accent-soft `rgba(63,151,255,.14)` · accent-ring `rgba(63,151,255,.40)`  *(this is the "Azure" default; accent is themeable — see palette below)*
- success `#3dd68c` (soft `.14`) · warn `#f3b13f` (soft `.14`) · danger `#f2647e` (soft `.14`)
- elevation e1 `0 2px 6px rgba(0,0,0,.32)` · e2 `0 14px 38px rgba(0,0,0,.46)`

**Color — Light (`[data-sf="light"]`):**
- bg `#eaeef4` · surface `#ffffff` · surface-2 `#f4f7fb` · surface-3 `#e9eef5`
- line `#dbe2ec` · line-strong `#c2ccda`
- text `#121823` · text-2 `#48566b` · text-3 `#78859a`
- accent `#1f74e6` / strong `#1666cf` / soft `rgba(31,116,230,.10)` / ring `.38`
- success `#0f9d63` · warn `#b9791a` · danger `#d23b58`
- e1 `0 2px 6px rgba(30,50,90,.10)` · e2 `0 16px 40px rgba(30,50,90,.16)`

**Accent palette** (each has dark `d`, dark-strong `ds`, light `l`, light-strong `ls`): **Azure** `#3f97ff` (default), **Electric** `#6a7bff`, plus the additional curated options defined in `PAL` in the prototype. Brand orange for the "Forge" wordmark + type accent: `#f5872f`.

**Laser-type accent colors:** CO₂ `#f3934f` · Fiber `#3f97ff` · Diode `#3dd68c` · UV `#a672f6` · IR-MOPA `#f2647e`.

**Radius:** cards ~14px, tiles/inputs ~9–12px, pills/badges 999px. **Border:** 1px `--sf-line`. **Background texture:** a faint 1px grid over `--sf-bg`.

**Type sizes (reference):** page title Sora ~22–30px/700; card/row title 13.5–14px/600; body 13–15px; mono labels 8–11px uppercase, letter-spacing .1–.18em; large metric values Sora.

## Assets
- **Logo:** inline SVG (faceted crystal + spectrum fan + input beam) — recreate as an SVG component; see the header in the prototype and concept "2a" in the logo file. No external logo file.
- **Icons:** inline stroked SVGs (24×24, `stroke: currentColor`, width ~1.7–1.8) — replace with your icon library (e.g. Lucide) matching the same weight.
- **Images:** all photos are user-uploaded (materials reference, attempt input/result). No bundled photography.
- No emoji in UI chrome; the "⟿" glyph is used only in the provenance chip.

## Files
- `design/SpectraForge v2.dc.html` — the full app prototype (all screens + logic).
- `design/SpectraForge Logo Concepts.dc.html` — logo exploration; chosen mark = concept "2a".
- `design/support.js`, `design/image-slot.js` — prototype runtime only; **do not port**.
- `BUILD_SPEC.md` — stack, deployment, AI architecture, seed presets.
- `DATA_MODEL.md` — entities, fields, relationships, parameter schema.
