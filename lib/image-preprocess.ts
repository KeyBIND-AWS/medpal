// lib/image-preprocess.ts
import sharp from 'sharp';

/** Max long-edge width we upscale/limit to. ~2000px is the sweet spot for
 *  Textract/Comprehend Medical detail vs. payload size. */
const TARGET_WIDTH = 2000;
const JPEG_QUALITY = 92;

/** Strip a `data:image/...;base64,` prefix if present; return raw base64. */
function stripDataUriPrefix(input: string): string {
  return input.replace(/^data:image\/\w+;base64,/, '');
}

/**
 * Preprocess a scan image to improve downstream OCR / vision accuracy.
 *
 * Pipeline (all from sharp 0.34, libvips):
 *   .rotate()                              -> auto-orient using EXIF (no arg = honor EXIF)
 *   .grayscale()                           -> drop color; OCR cares about luminance
 *   .normalise()                           -> contrast stretch (maps darkest->0, lightest->255)
 *   .sharpen()                             -> unsharp mask; recovers blurry phone text edges
 *   .resize({ width, withoutEnlargement:false }) -> upscale tiny shots, cap huge ones
 *   .jpeg({ quality: 92 })                 -> re-encode; keeps payload reasonable
 *
 * @param imageBase64 base64 string, with OR without a data-URI prefix.
 * @returns a base64 string WITHOUT any data-URI prefix. On ANY error, returns
 *          the original (prefix-stripped) input so a scan never fails because
 *          preprocessing failed.
 */
export async function preprocessScanImage(imageBase64: string): Promise<string> {
  const raw = stripDataUriPrefix(imageBase64);
  try {
    const inputBuffer = Buffer.from(raw, 'base64');

    const outputBuffer = await sharp(inputBuffer)
      .rotate()                 // honor EXIF orientation
      .grayscale()
      .normalise()              // contrast stretch
      .sharpen()
      .resize({ width: TARGET_WIDTH, withoutEnlargement: false })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return outputBuffer.toString('base64');
  } catch (err) {
    // Never block a scan because preprocessing failed. Log and fall back to
    // the original (prefix-stripped) base64 so the caller still gets valid input.
    console.warn('preprocessScanImage: falling back to original image —', err);
    return raw;
  }
}
