import { createClient } from "@/lib/supabase/server";

export const ATTEMPT_BUCKET = "attempt-photos";
export const CALIBRATION_BUCKET = "calibration-photos";

/** Object key convention: {ownerId}/{recordId}/{name}. First segment = uid so
 *  storage RLS (migration 0004) scopes access to the owner. */
export function photoKey(ownerId: string, recordId: string, name: string): string {
  return `${ownerId}/${recordId}/${name}`;
}

/** Batch-create short-lived signed URLs for the given paths in one bucket.
 *  Returns a map path → url (missing/failed paths are omitted). */
export async function signedUrlMap(bucket: string, paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  const clean = paths.filter((p): p is string => !!p);
  if (clean.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(clean, expiresIn);
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
  }
  return map;
}
