import path from "node:path";

/**
 * Shared deploy-state directory — the bridge between the running app (inside the
 * Docker container) and the host-side auto-updater (`deploy/update.sh`, driven by
 * systemd). The app can't run `docker`/`git` on the host, so instead of a Docker
 * socket we use a bind-mounted directory:
 *
 *   - the updater WRITES `last-update.json` after every run (timer or manual);
 *   - the "Update now" button WRITES `update-requested.json`, which a systemd
 *     `.path` unit watches → runs the updater immediately.
 *
 * `process.cwd()` is `/app` in the container (mount: `/app/deploy/state`) and the
 * repo root in local dev — so the same join resolves correctly in both.
 */
export const STATE_DIR = path.join(process.cwd(), "deploy", "state");
export const STATUS_FILE = path.join(STATE_DIR, "last-update.json");
export const REQUEST_FILE = path.join(STATE_DIR, "update-requested.json");

/** The release/ref this image was built from (baked in via Dockerfile ARG). */
export const RUNNING_VERSION = process.env.SF_VERSION || "dev";

/** Update channel the host updater runs on (informational display only). */
export const UPDATE_CHANNEL = process.env.SF_UPDATE_CHANNEL || "stable";

export interface UpdateStatus {
  finishedAt: string;
  status: "updated" | "up-to-date" | "error";
  trigger: "timer" | "manual";
  channel: string;
  fromVersion: string;
  toVersion: string;
  message: string;
}
