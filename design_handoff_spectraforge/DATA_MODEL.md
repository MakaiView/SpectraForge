# DATA_MODEL — SpectraForge

Entities, fields, and relationships, derived from the prototype's data structures. Field names below mirror the prototype; adapt casing/typing to your ORM. All user data is per-account.

---

## The backbone: the parameter-schema system

Everything (machine ranges, recipe params, attempt params, calibration axes, grading) is driven by two lookup tables. Model these as constants/config, not per-row data.

### `PARAM_DEFS` — every parameter the app knows
| key | label | short | unit | kind |
|---|---|---|---|---|
| power | Power | PWR | % | range |
| speed | Speed | SPD | mm/s | range |
| freq | Frequency | FREQ | kHz | range |
| qpulse | Q-Pulse | QPLS | ns | range |
| pulse | Pulse width | PULSE | ns | range |
| interval | Interval | INT | mm | range |
| dpi | Resolution | DPI | dpi | range |
| passes | Passes | PASS | — | count |

`kind: range` → has {min,max}; `kind: count` → single max (integer).

### `TYPE_PARAMS` — which params each laser type exposes, in display order
- **co2:** power, speed, passes, dpi
- **diode:** power, speed, passes, dpi
- **fiber:** power, speed, freq, passes
- **ir (IR-MOPA):** power, speed, freq, pulse, passes
- **uv:** qpulse, speed, freq, interval, passes  ← **no power %**

**Rule:** anywhere parameters are shown, entered, or graded, iterate the machine type's `TYPE_PARAMS` list — never a fixed set. `interval` displays to 3 decimals; others to 0 (except where noted).

### `MACHINE_TYPES` — the five laser types (label, sub, accent color)
- co2 — "CO₂" · Gas tube · galvo-free · `#f3934f`
- fiber — "Fiber" · Galvo · metal marking · `#3f97ff`
- diode — "Diode" · Solid-state · entry · `#3dd68c`
- uv — "UV" · Cold marking · 355nm · `#a672f6`
- ir — "IR-MOPA" · Pulsed fiber · color marking · `#f2647e`

---

## Machine
A physical laser + its capabilities. Prefills new recipes/attempts and drives calibration axes.
- `id`, `name`
- `manufacturer`, `model`
- `type` — one of MACHINE_TYPES keys
- `watts` (int), `bedW`, `bedH` (mm)
- `addons` — set of add-on ids that are present (see ADDONS)
- `ranges` — object keyed by param key → `{min,max}` for range params, `{max}` for `passes`. Only the keys relevant to the type are meaningful. **Example (UV/Quanta):** `{ qpulse:{min:1,max:200}, speed:{min:100,max:7000}, freq:{min:20,max:200}, interval:{min:0.005,max:0.1}, passes:{max:15} }`.
- `recipes` (count, derive in real app), `lastUsed`
- *(Recommended new field for the real app:* `lens`/`module` *— e.g. ComMarker Omni XE 70mm vs 150mm, Snapmaker 2W vs 10W — since lens/module changes working area + effective ranges. Treat as part of machine identity.)*

**Seed machines in prototype:** Aurora (OMTech AF2028-100, CO₂ 60W), Pulsar (JPT M7 MOPA, IR 30W), Nova (xTool D1 Pro, diode 10W), Helios (Thunder Laser Nova 35, CO₂ 100W), Quanta (Trumpf V-Series UV, UV 5W), Forge (Raycus RFL-50, fiber 50W). These are illustrative — the owner's real machines are the ComMarker Omni XE (70/150mm) and Snapmaker (2W/10W); see BUILD_SPEC §5.

### `ADDONS` (accessories, id · label)
airAssist · Air Assist; rollerRotary · Roller Rotary; chuckRotary · Chuck Rotary; honeycomb · Honeycomb Bed; passthrough · Pass-through; camera · Camera / Lid; autofocus · Auto-focus; fume · Fume Extractor. (Icons in prototype; map to your icon set.)

## MachineBaseline / Preset  *(new for real app — see BUILD_SPEC §6)*
Owner-provided starting settings used as calibration baselines + AI grounding.
- `machineId` (+ `lens`/`module`), `materialId` or material descriptor, `process`
- `params` — starting values (keyed by param key, within the machine's ranges)
- `source` — e.g. "manufacturer", `notes`
- Provide an import path (paste/upload tables). Numbers are owner-supplied — never invent.

## Material
- `id`, `name`
- `cat` — **category from the managed list** (see MaterialCategory) — a dropdown, not free text
- `thickness` (e.g. "3–6 mm")
- `hazard` — `low | medium | high`
- `grade` (e.g. "BB/BB, void-free core"), `safePower` (e.g. "80–95% @ CO₂")
- `notes`, `safety`
- `recipeIds` — recipes documented against this material (derive via FK in real app)
- reference photo (Storage ref)

## MaterialCategory
User-managed list feeding the material category dropdown (Settings → Material Categories).
- Seed: Wood, Acrylic, Metal, Glass / Ceramics, Stone / Slate, Leather, Paper / Card, Fabric / Textile, Plastic / Silicone, Tumblers / Drinkware, Coated / Anodized, Food, Other.

## Recipe
A proven settings set for a material + machine + process.
- `id`, `material` (name/ref), `name` (e.g. "Frosted edge cut")
- `process` — `cut | engrave | mark`
- `machineId` (+ derived `machine` string, `machineType`)
- `thickness`
- `params` — values keyed by param key; **displayed via the machine type's `TYPE_PARAMS`** (type-aware)
- `status` — `draft | cal (calibrated) | review | fail`
- `attempts` (count), `notes`, `verifiedBy`, `lastVerified`
- **Provenance:** `calRunId` (nullable) + `calTests` (count) — set when promoted from a calibration run; renders the "⟿ Calibrated in the Lab · N test grids" chip linking back to the run.
- favorite flag (per user).

`blankRecipe()` defaults: process `cut`, `machineId` = current active machine, empty params/notes, no provenance.

## Attempt
A real burn logged for the record; refines recipes.
- `id`, `date`
- `material` (name/ref), `process`, `machineId` (+ derived machine string, type)
- `outcome` — `clean | marginal(partial) | fail`
- `params` — values keyed by param key (type-aware)
- `addons` used (subset), `note`
- **Photos:** input photo + result photo (Storage refs) — shown as list thumbnails, in the view modal, and in a lightbox; contained (letterboxed) in share-cards.

`blankAttempt()` defaults: process `cut`, `machineId` = current active machine, outcome `clean`, empty params/note.

## CalibrationRun (core)
A saved, resumable dial-in session for a material.
- `id`, `name` (e.g. "3 mm Birch — clean cut")
- `materialId`, `machineId`
- `goal` — one of `GOALS` (below)
- `baseline` — optional MachineBaseline/preset the first grid centers on
- `status` — `in-progress | promoted`
- `updated` (date)
- `tests` — ordered list of **CalibrationTest** (drives the adaptive `Setup · Test 1 · … · Promote` stepper)
- `promotedSquare` / promoted recipe ref (when promoted)

### `GOALS` (id · label · sub · maps to process)
- cut · Clean cut-through · Full separation, minimal char · cut
- engrave · Surface engrave · Crisp, shallow engrave · engrave
- deep · Deep / 3D engrave · Maximum depth & relief · engrave
- photo · Photo / halftone · Tonal raster image · engrave
- mark · High-contrast mark · Bold, legible marking · mark
- color · Color / anneal · MOPA color or oxide anneal · mark
- coat · Coating removal · Ablate coat to substrate · mark
- char · Minimal charring · Clean edges, no scorch · cut

### CalibrationTest (one grid iteration)
- `index` (Test 1, 2, …), `pattern` (see PATTERNS)
- `axes` — `{ x:{key,min,max,count}, y:{key,min,max,count} }` where keys come from the machine type + pattern (see axis mapping), values held to nice round numbers
- `statics` — the fixed params not on either axis (carried from baseline/previous best)
- `grid` — cells keyed by (row,col) → `{ grade: clean|partial|fail|ungraded }`; default 5×5
- `photo` — the burned-sheet photo (Storage ref) → **feeds AI grading + the data flywheel**
- `bestSquare` — the chosen/recommended cell (its resolved params)
- `analysis` — headline + write-up (→ real AI)

### `PATTERNS` (id · label · sub)
- pxs · Power × Speed · Cut & engrave baseline
- interval · Interval / DPI · Engrave fill quality
- freq · Frequency / Q-Pulse · Fiber · UV · IR marking
- multipass · Multi-pass depth · Passes × power

**Axis mapping (`testAxes`)**: from the machine type's ordered `TYPE_PARAMS` (primary = first key, i.e. power, or qpulse for UV). E.g. pattern `pxs` → `{ x:'speed', y: primary }`. Non-applicable params for the type are dimmed/omitted. Axis values divide the range evenly (LightBurn Material Test semantics) and must snap to round numbers (`niceStep`/`snapAxis`); a round-guard warns and offers "Make round".

**Refine** builds the next CalibrationTest centered on the current `bestSquare` with a finer step. **Promote** takes a square's resolved params → prefills `blankRecipe()` (material, machineId, process = goal→proc, params, name = goal label) and stamps `calRunId` + `calTests` provenance.

## User / Account (auth) — see BUILD_SPEC §3
The prototype simulates this in localStorage; the real app uses **Supabase Auth** (auth.users) + a `Profile` row per user. **Never store plaintext passwords** — Supabase hashes credentials; the prototype's plaintext `pw` is a demo shortcut only.

### Profile (one per auth user)
- `id` (FK → auth user), `name`, `email`
- `role` — `admin | member` (drives Admin Console visibility + server-side authorization via RLS)
- `company` / workspace
- `active` — boolean; inactive accounts are rejected at login
- `createdAt`
- Derived UI: `initials` (from name), plan label ("Studio · Pro")
- **Seed accounts (prototype):** Riley Okafor (admin, active), Sam Ortega (member, active), Jules Whitmore (member, disabled — demonstrates the login block). Passwords are demo-only.

### WorkspaceSettings (single row / per-workspace)
- `registration_open` — boolean, **default false**. When false: sign-up is rejected server-side and the login gate hides the "Create one" link ("Registration is by invitation only"). Toggled from the Admin Console.

**Admin actions** (admin-only server routes): create user (name/email/password/role/active), edit user, change role, enable/disable (`active`), delete. **Guard:** a user cannot disable or delete their own account.

## User Settings (preferences)
- Profile display: `userName`, `userCompany`, plan (e.g. "Studio · Pro") — seeded from the signed-in Profile.
- Appearance: `theme` (`dark|light`), `accent` (PAL key; default `azure`).
- **AI config:** provider (`anthropic|openai|google|ollama`), model, apiKey, baseUrl (Ollama). *(Prototype stores only; implement real calls server-side — BUILD_SPEC §5. Uploaded photos reach the vision model via the base64-inline path — BUILD_SPEC §4.)*
- Notifications: toggle set.
- `onboarded` flag (first-run tour).
- Card identity: show name / company / both / neither on share-cards.
- Most preference edits auto-save (with a "Saved ✓" toast); create/edit entities use explicit Save.

### `PAL` (accent palette; each: dark `d`, dark-strong `ds`, light `l`, light-strong `ls`, label)
- azure — d `#3f97ff` / ds `#67adff` / l `#1f74e6` / ls `#1666cf` (default)
- electric — d `#6a7bff` / ds `#8a98ff` / l `#4453e6` / ls `#3a48cf`
- …plus the remaining curated options defined in `PAL` in the prototype (read the full object from `SpectraForge v2.dc.html`).

---

## Relationship summary
- **Machine** 1—N **Recipe**, 1—N **Attempt**, 1—N **CalibrationRun**, 1—N **MachineBaseline**.
- **Material** 1—N **Recipe**, 1—N **Attempt**, 1—N **CalibrationRun**; **Material.cat** → **MaterialCategory**.
- **CalibrationRun** 1—N **CalibrationTest**; a promoted run → 1 **Recipe** (`Recipe.calRunId`).
- **Recipe** 1—N **Attempt** (attempts refine a recipe).
- Machine `type` → `TYPE_PARAMS` → the param set used by that machine's recipes/attempts/calibration axes and its `ranges`.
- **Profile** (auth user) has a `role` (admin/member) and `active` flag; **WorkspaceSettings.registration_open** gates sign-up. Everything else is scoped to a **User**.
