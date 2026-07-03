import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processPhoto } from "@/lib/images/process";
import { CALIBRATION_BUCKET, photoKey } from "@/lib/storage/photos";

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Upload the burned-sheet photo for a calibration test. Same ingest pipeline as
 * attempts (EXIF/downscale/thumbnail, §4a); stored under {uid}/{testId}/ in the
 * private calibration-photos bucket. This photo is the labeled training datum
 * that feeds the future vision grader (the data flywheel, §5d).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: test } = await supabase.from("calibration_tests").select("id, run_id").eq("id", id).single();
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is too large (max 25 MB)." }, { status: 413 });

  let full: Buffer, thumb: Buffer;
  try {
    ({ full, thumb } = await processPhoto(Buffer.from(await file.arrayBuffer())));
  } catch {
    return NextResponse.json({ error: "Could not read that image." }, { status: 400 });
  }

  const fullKey = photoKey(user.id, id, "sheet.jpg");
  const thumbKey = photoKey(user.id, id, "sheet_thumb.jpg");
  const up1 = await supabase.storage.from(CALIBRATION_BUCKET).upload(fullKey, full, { contentType: "image/jpeg", upsert: true });
  const up2 = await supabase.storage.from(CALIBRATION_BUCKET).upload(thumbKey, thumb, { contentType: "image/jpeg", upsert: true });
  if (up1.error || up2.error) return NextResponse.json({ error: "Upload failed." }, { status: 500 });

  const { error } = await supabase.from("calibration_tests").update({ photo_path: fullKey, photo_thumb_path: thumbKey }).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not attach the photo." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
