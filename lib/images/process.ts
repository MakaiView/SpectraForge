import sharp from "sharp";

/**
 * Process an uploaded photo on ingest (BUILD_SPEC §4a): honor EXIF orientation
 * (phone photos arrive rotated), downscale + compress the stored original
 * (long edge ~1600px), and generate a thumbnail (long edge ~400px) for list
 * rows/cards. Both come back as JPEG buffers. Keeps Storage small and display
 * fast; never store the raw bytes.
 *
 * SVG inputs (common for attempt *design* art) are rasterized crisply: sharp
 * reports an SVG's px size at 72dpi, so we scale the render density to land the
 * long edge near 1600px. Any transparency (SVG or PNG alpha) is flattened onto
 * white before JPEG — otherwise transparent areas would encode as black and
 * invert line art.
 */
export async function processPhoto(input: Buffer): Promise<{ full: Buffer; thumb: Buffer }> {
  // For vector input, choose a render density that yields a ~1600px long edge.
  let loadOpts: sharp.SharpOptions = {};
  try {
    const meta = await sharp(input).metadata();
    if (meta.format === "svg") {
      const long = Math.max(meta.width ?? 0, meta.height ?? 0);
      const density = long > 0 ? Math.min(600, Math.max(96, Math.round((1600 / long) * 72))) : 200;
      loadOpts = { density };
    }
  } catch {
    /* fall through with defaults — the resize below still runs */
  }

  // .rotate() with no args bakes in EXIF orientation, then we can safely resize.
  // For SVG this rasterizes to PNG at the chosen density.
  const oriented = await sharp(input, loadOpts).rotate().toBuffer();

  const full = await sharp(oriented)
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82 })
    .toBuffer();

  const thumb = await sharp(oriented)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 70 })
    .toBuffer();

  return { full, thumb };
}
