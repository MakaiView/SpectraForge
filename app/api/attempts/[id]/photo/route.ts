import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processPhoto } from "@/lib/images/process";
import { ATTEMPT_BUCKET, photoKey } from "@/lib/storage/photos";

const MAX_BYTES = 25 * 1024 * 1024; // phone photos can be large; cap the raw upload
const KINDS = new Set(["input", "result"]);

/**
 * Upload (or replace) an attempt photo. Multipart: `kind` = input|result,
 * `file` = the image. Processes on ingest (EXIF/​downscale/​thumbnail, §4a),
 * stores full + thumb in the private attempt-photos bucket under
 * {uid}/{attemptId}/, and writes the paths onto the attempt row. Storage RLS +
 * the row's owner RLS ensure the caller owns the attempt.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Confirm the attempt exists and belongs to the caller (RLS also enforces this).
  const { data: attempt } = await supabase.from("attempts").select("id").eq("id", id).single();
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const form = await request.formData();
  const kind = String(form.get("kind") || "");
  const file = form.get("file");
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Invalid photo kind." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is too large (max 25 MB)." }, { status: 413 });

  let full: Buffer, thumb: Buffer;
  try {
    ({ full, thumb } = await processPhoto(Buffer.from(await file.arrayBuffer())));
  } catch {
    return NextResponse.json({ error: "Could not read that image." }, { status: 400 });
  }

  const fullKey = photoKey(user.id, id, `${kind}.jpg`);
  const thumbKey = photoKey(user.id, id, `${kind}_thumb.jpg`);

  const up1 = await supabase.storage.from(ATTEMPT_BUCKET).upload(fullKey, full, { contentType: "image/jpeg", upsert: true });
  const up2 = await supabase.storage.from(ATTEMPT_BUCKET).upload(thumbKey, thumb, { contentType: "image/jpeg", upsert: true });
  if (up1.error || up2.error) return NextResponse.json({ error: "Upload failed." }, { status: 500 });

  const patch =
    kind === "input"
      ? { input_path: fullKey, input_thumb_path: thumbKey }
      : { result_path: fullKey, result_thumb_path: thumbKey };
  const { error } = await supabase.from("attempts").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not attach the photo." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** Remove an attempt photo (both full + thumb) and clear its paths. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const kind = new URL(request.url).searchParams.get("kind") || "";
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Invalid photo kind." }, { status: 400 });

  await supabase.storage.from(ATTEMPT_BUCKET).remove([photoKey(user.id, id, `${kind}.jpg`), photoKey(user.id, id, `${kind}_thumb.jpg`)]);
  const patch = kind === "input" ? { input_path: null, input_thumb_path: null } : { result_path: null, result_thumb_path: null };
  await supabase.from("attempts").update(patch).eq("id", id);
  return NextResponse.json({ ok: true });
}
