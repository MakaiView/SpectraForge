/** Screen metadata (kicker + title) — lifted from the prototype's SCREENS. */
export interface ScreenMeta {
  kicker: string;
  title: string;
  desc?: string;
}

export const SCREENS: Record<string, ScreenMeta> = {
  dashboard: { kicker: "OVERVIEW", title: "Dashboard" },
  recipes: { kicker: "LIBRARY", title: "Recipes", desc: "The full recipe library — searchable, filterable by machine and process, with the parameter detail view." },
  materials: { kicker: "LIBRARY", title: "Materials", desc: "Every material you work with, its safe ranges, hazards, and the recipes documented against it." },
  machines: { kicker: "LIBRARY", title: "Machines", desc: "Your lasers, their add-ons, and the setting ranges that constrain every recipe and calibration run." },
  calibration: { kicker: "TOOLS", title: "Calibration Lab", desc: "Generate power/speed test grids, log the results, and let the app converge on a calibrated recipe." },
  attempts: { kicker: "HISTORY", title: "Attempts", desc: "The complete log of cuts and engraves — outcomes, photos, and the settings behind each one." },
  favorites: { kicker: "LIBRARY", title: "Favorites", desc: "Your starred, go-to recipes — the ones you reach for every week." },
  review: { kicker: "QUEUE", title: "Needs Review", desc: "Recipes and attempts flagged for a closer look before they earn the calibrated mark." },
  tools: { kicker: "UTILITIES", title: "Tools", desc: "Quick laser-bench calculators — unit conversion, rotary wrap planning and run-time." },
  profile: { kicker: "ACCOUNT", title: "Profile", desc: "Your account, security and notification preferences." },
  admin: { kicker: "ADMIN", title: "Admin Console", desc: "Manage user accounts, roles and registration access for your SpectraForge workspace." },
  help: { kicker: "SUPPORT", title: "Help & Docs", desc: "How SpectraForge works — machines, recipes, attempts, calibration and the settings behind them." },
  settings: { kicker: "PREFERENCES", title: "Settings" },
};

/** Sidebar groups → items. `admin: true` items render for admins only. */
export interface NavItem {
  key: string;
  label: string;
  href: string;
  admin?: boolean;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { label: "WORKSPACE", items: [{ key: "dashboard", label: "Dashboard", href: "/dashboard" }] },
  {
    label: "LIBRARY",
    items: [
      { key: "recipes", label: "Recipes", href: "/recipes" },
      { key: "materials", label: "Materials", href: "/materials" },
      { key: "machines", label: "Machines", href: "/machines" },
    ],
  },
  {
    label: "ACTIVITY",
    items: [
      { key: "calibration", label: "Calibration Lab", href: "/calibration" },
      { key: "attempts", label: "Attempts", href: "/attempts" },
    ],
  },
  {
    label: "COLLECTIONS",
    items: [
      { key: "favorites", label: "Favorites", href: "/favorites" },
      { key: "review", label: "Needs Review", href: "/review" },
    ],
  },
  { label: "UTILITIES", items: [{ key: "tools", label: "Tools", href: "/tools" }] },
  { label: "ADMIN", items: [{ key: "admin", label: "Admin Console", href: "/admin", admin: true }] },
];
