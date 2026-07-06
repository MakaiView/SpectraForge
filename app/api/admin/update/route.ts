import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { requireAdmin, AuthorizationError } from "@/lib/auth/session";
import { STATE_DIR, STATUS_FILE, REQUEST_FILE, RUNNING_VERSION, UPDATE_CHANNEL, type UpdateStatus } from "@/lib/deploy/state";

export const dynamic = "force-dynamic";

async function readStatus(): Promise<UpdateStatus | null> {
  try {
    return JSON.parse(await fs.readFile(STATUS_FILE, "utf8")) as UpdateStatus;
  } catch {
    return null; // no update has run yet, or the state dir isn't mounted
  }
}

async function requestPending(): Promise<boolean> {
  try {
    await fs.access(REQUEST_FILE);
    return true;
  } catch {
    return false;
  }
}

/** Current running version + last update result + whether a request is queued. */
export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
  return NextResponse.json({
    version: RUNNING_VERSION,
    channel: UPDATE_CHANNEL,
    last: await readStatus(),
    pending: await requestPending(),
  });
}

/**
 * Queue an update: drop a request file the host's systemd `.path` unit watches,
 * which runs deploy/update.sh immediately (fetch tags → deploy newest release,
 * or force-rebuild the current one). The app can't touch docker/git directly, so
 * this file-drop is the whole handoff — no Docker socket, no host shell access.
 */
export async function POST() {
  let me;
  try {
    me = await requireAdmin();
  } catch (e) {
    if (e instanceof AuthorizationError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  try {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(
      REQUEST_FILE,
      JSON.stringify({ requestedAt: new Date().toISOString(), requestedBy: me.email, force: true }, null, 2),
    );
    await fs.chmod(REQUEST_FILE, 0o666).catch(() => {});
  } catch {
    return NextResponse.json(
      { error: "Couldn't queue the update — the deploy state directory isn't writable. Is the auto-updater installed?" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
