// ===================================================
// generate_thumbnails.mjs — High-Contrast CrazyGames Submission Thumbnails
// Generates official 512x384 (standard) and 512x512 (icon) PNGs
// Uses pure Node.js + zlib (zero external dependencies)
// ===================================================

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPNG(width, height, pixelFn) {
  // RGBA raw buffer with 1 filter byte (0) per row
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a !== undefined ? a : 255;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // CRC32 table & helper
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function writeChunk(type, data) {
    const len = data ? data.length : 0;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    if (data) data.copy(buf, 8);
    const chunkDataForCrc = buf.subarray(4, 8 + len);
    buf.writeUInt32BE(crc32(chunkDataForCrc), 8 + len);
    return buf;
  }

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = writeChunk('IHDR', ihdrData);

  // IDAT Chunk
  const idatChunk = writeChunk('IDAT', deflated);

  // IEND Chunk
  const iendChunk = writeChunk('IEND', null);

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Render dynamic Dark Fantasy Artwork with glowing sky island, golden arches, and emerald stars
function renderBanner(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background radial dark purple/blue gradient (Midnight Eldoria)
  const cx = w * 0.5;
  const cy = h * 0.45;
  const dist = Math.hypot(x - cx, y - cy) / (Math.hypot(w, h) * 0.5);

  let r = Math.floor(18 + (1 - dist) * 45);
  let g = Math.floor(10 + (1 - dist) * 25);
  let b = Math.floor(38 + (1 - dist) * 75);

  // Horizon warm sunset glow in lower-center
  const sunDist = Math.hypot(x - cx, y - h * 0.65) / (w * 0.4);
  if (sunDist < 1.0) {
    const factor = Math.pow(1 - sunDist, 2.5);
    r = Math.min(255, r + Math.floor(255 * factor));
    g = Math.min(255, g + Math.floor(160 * factor));
    b = Math.min(255, b + Math.floor(40 * factor));
  }

  // Floating Sky Island Silhouette (central rock formation)
  const islandDx = (x - cx) / (w * 0.28);
  const islandTop = h * 0.52 - (1 - islandDx * islandDx) * (h * 0.08);
  const islandBottom = h * 0.52 + Math.max(0, (1 - Math.abs(islandDx)) * (h * 0.22));

  if (Math.abs(islandDx) < 1.0 && y >= islandTop && y <= islandBottom) {
    // Rocky cliff shading
    const rockShadow = (y - islandTop) / (islandBottom - islandTop);
    r = Math.floor(24 * (1 - rockShadow) + 12 * rockShadow);
    g = Math.floor(42 * (1 - rockShadow) + 16 * rockShadow);
    b = Math.floor(28 * (1 - rockShadow) + 20 * rockShadow);
    // Green lush grassy plateau on top surface
    if (y < islandTop + 6) {
      r = 34; g = 197; b = 94;
    }
  }

  // Glowing Updraft Vent & Gold Wind Rings
  const ringDist = Math.abs(Math.hypot(x - (cx + w * 0.18), y - (h * 0.42)) - w * 0.07);
  if (ringDist < 3.5) {
    const ringGlow = 1 - ringDist / 3.5;
    r = Math.min(255, r + Math.floor(250 * ringGlow));
    g = Math.min(255, g + Math.floor(200 * ringGlow));
    b = Math.min(255, b + Math.floor(50 * ringGlow));
  }

  // Falcon Glider Silhouette high above
  const gliderX = cx - w * 0.08;
  const gliderY = h * 0.32;
  const gdx = Math.abs(x - gliderX);
  const gdy = Math.abs(y - gliderY);
  if (gdx < 22 && gdy < 8 && gdy < (22 - gdx) * 0.45) {
    // Glowing cyan/gold paraglider wing
    r = 251; g = 191; b = 36;
  }

  // High contrast golden border vignette (2px outer frame)
  if (x < 3 || x >= w - 3 || y < 3 || y >= h - 3) {
    r = 251; g = 191; b = 36;
  }

  return [
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b)),
    255
  ];
}

console.log('Generating CrazyGames store assets...');

const publicDir = path.resolve('public');
const storeAssetsDir = path.resolve('crazygames-assets');
for (const dir of [publicDir, storeAssetsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 1. Official Landscape Cover (1920x1080 - 16:9)
console.log('Rendering 1920x1080 Landscape Cover...');
const landBuf = createPNG(1920, 1080, renderBanner);
fs.writeFileSync(path.join(publicDir, 'cover_landscape_1920x1080.png'), landBuf);
fs.writeFileSync(path.join(storeAssetsDir, 'cover_landscape_1920x1080.png'), landBuf);
console.log('✔ Created cover_landscape_1920x1080.png (1920x1080)');

// 2. Official Portrait Cover (800x1200 - 2:3)
console.log('Rendering 800x1200 Portrait Cover...');
const portBuf = createPNG(800, 1200, renderBanner);
fs.writeFileSync(path.join(publicDir, 'cover_portrait_800x1200.png'), portBuf);
fs.writeFileSync(path.join(storeAssetsDir, 'cover_portrait_800x1200.png'), portBuf);
console.log('✔ Created cover_portrait_800x1200.png (800x1200)');

// 3. Official Square Icon (800x800 - 1:1)
console.log('Rendering 800x800 Square Cover...');
const sqBuf = createPNG(800, 800, renderBanner);
fs.writeFileSync(path.join(publicDir, 'cover_square_800x800.png'), sqBuf);
fs.writeFileSync(path.join(storeAssetsDir, 'cover_square_800x800.png'), sqBuf);
console.log('✔ Created cover_square_800x800.png (800x800)');

// 4. Standard 512x384 Thumbnail & 512x512 Icon
const thumbBuf = createPNG(512, 384, renderBanner);
fs.writeFileSync(path.join(publicDir, 'thumbnail_512x384.png'), thumbBuf);
fs.writeFileSync(path.join(storeAssetsDir, 'thumbnail_512x384.png'), thumbBuf);
console.log('✔ Created thumbnail_512x384.png (512x384)');

const iconBuf = createPNG(512, 512, renderBanner);
fs.writeFileSync(path.join(publicDir, 'icon_512x512.png'), iconBuf);
fs.writeFileSync(path.join(storeAssetsDir, 'icon_512x512.png'), iconBuf);
console.log('✔ Created icon_512x512.png (512x512)');

