import sharp from "sharp";

/**
 * Process an uploaded photo on ingest (BUILD_SPEC §4a): honor EXIF orientation
 * (phone photos arrive rotated), downscale + compress the stored original
 * (long edge ~1600px), and generate a thumbnail (long edge ~400px) for list
 * rows/cards. Both come back as JPEG buffers. Keeps Storage small and display
 * fast; never store the raw bytes.
 */
export async function processPhoto(input: Buffer): Promise<{ full: Buffer; thumb: Buffer }> {
  // .rotate() with no args bakes in EXIF orientation, then we can safely resize.
  const oriented = await sharp(input).rotate().toBuffer();

  const full = await sharp(oriented)
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const thumb = await sharp(oriented)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();

  return { full, thumb };
}
