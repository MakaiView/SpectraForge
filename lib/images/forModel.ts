import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

/**
 * Pull a Storage object and prepare it for the vision model (BUILD_SPEC §4b):
 * download the bytes server-side, downscale specifically for the model (~1568px
 * long edge is plenty and cuts latency/cost), and base64-encode. The image never
 * leaves our server except inside the model request body — buckets stay private,
 * so we never hand the model a URL.
 */
export async function objectToModelBase64(bucket: string, path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  const resized = await sharp(buf).rotate().resize(1568, 1568, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  return resized.toString("base64");
}
