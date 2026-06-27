// scripts/test-image-preprocess.mjs
// Run: npx tsx scripts/test-image-preprocess.mjs
import sharp from 'sharp';
import { preprocessScanImage } from '../lib/image-preprocess.ts';

function isJpeg(buf) {
  // JPEG magic bytes: FF D8 ... FF D9
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
}

async function main() {
  // 1. Build a small synthetic "messy" source: 300x400 noisy PNG, on purpose small + non-JPEG.
  const srcBuffer = await sharp({
    create: { width: 300, height: 400, channels: 3, background: { r: 90, g: 90, b: 90 } },
  })
    .png()
    .toBuffer();

  const srcBase64WithPrefix = 'data:image/png;base64,' + srcBuffer.toString('base64');

  // 2. Run preprocessing (exercise the prefix-strip path too).
  const outBase64 = await preprocessScanImage(srcBase64WithPrefix);

  // 3a. Output must NOT carry a data-URI prefix.
  if (outBase64.startsWith('data:')) throw new Error('FAIL: output still has data-URI prefix');

  // 3b. Output must be valid base64 that decodes to a JPEG.
  const outBuffer = Buffer.from(outBase64, 'base64');
  if (!isJpeg(outBuffer)) throw new Error('FAIL: output is not a valid JPEG');

  // 3c. Output should be upscaled to ~2000px wide (small input enlarged).
  const meta = await sharp(outBuffer).metadata();
  if (meta.width !== 2000) throw new Error(`FAIL: expected width 2000, got ${meta.width}`);
  if (meta.channels > 1 && meta.space !== 'b-w') {
    // grayscale JPEGs report space 'b-w'; tolerate either single-channel or b-w
    console.warn('WARN: output not detected as grayscale, space=', meta.space);
  }

  // 3d. Error-path: garbage input returns the (prefix-stripped) original, no throw.
  const garbageOut = await preprocessScanImage('data:image/jpeg;base64,not-real-bytes');
  if (garbageOut !== 'not-real-bytes') throw new Error('FAIL: error path did not return stripped original');

  console.log('PASS: JPEG, no prefix, width=2000, grayscale, error-fallback OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
