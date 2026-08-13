/**
 * Generates the app icons as real PNG files.
 *
 *   node scripts/generate-icons.mjs
 *
 * Next's ImageResponse (@vercel/og) crashes on Windows + Node 24 with a
 * malformed font path, so the icons are rasterized here instead: a rounded
 * orange tile with a clothes hanger, drawn with signed-distance functions and
 * 3x supersampling for smooth edges. No image dependencies.
 */

import { deflateSync } from "zlib";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

// ------------------------------------------------------------- PNG encoding

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** RGBA pixel buffer -> PNG. */
function encodePng(rgba, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    rgba.copy(raw, o, y * size * 4, (y + 1) * size * 4);
    o += size * 4;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: truecolor + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------- distance functions

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Distance from point p to the segment ab. */
function segmentDist(p, a, b) {
  const pa = sub(p, a);
  const ba = sub(b, a);
  const h = clamp(dot(pa, ba) / dot(ba, ba), 0, 1);
  return len([pa[0] - ba[0] * h, pa[1] - ba[1] * h]);
}

/** Distance to a rounded rectangle centered at c with half-extents e. */
function roundedRectDist(p, c, e, r) {
  const q = [Math.abs(p[0] - c[0]) - e[0] + r, Math.abs(p[1] - c[1]) - e[1] + r];
  const outside = len([Math.max(q[0], 0), Math.max(q[1], 0)]);
  return outside + Math.min(Math.max(q[0], q[1]), 0) - r;
}

/** Distance to a circle outline (a ring), used for the hanger's hook. */
function ringDist(p, c, radius) {
  return Math.abs(len(sub(p, c)) - radius);
}

// -------------------------------------------------------------- the drawing

const BG_TOP = [224, 193, 132]; // brass, soft
const BG_BOTTOM = [156, 122, 60]; // brass, dim
const INK = [24, 17, 27]; // plum-black hanger line

/**
 * Evaluate the icon at one point in a 0..1 unit square.
 * Returns [r, g, b, a].
 */
function shade(x, y) {
  const p = [x, y];

  // Rounded tile. Full-bleed on iOS (it applies its own mask), so the corner
  // radius stays modest.
  const tile = roundedRectDist(p, [0.5, 0.5], [0.5, 0.5], 0.22);
  if (tile > 0) return [0, 0, 0, 0];

  // Vertical gradient background.
  const t = y;
  const bg = [
    BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t,
    BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t,
    BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t,
  ];

  // --- hanger geometry, in the same 0..1 space ---
  const stroke = 0.052;
  const apex = [0.5, 0.375];
  const left = [0.16, 0.7];
  const right = [0.84, 0.7];

  // Two shoulders and the bottom bar.
  let d = Math.min(
    segmentDist(p, apex, left),
    segmentDist(p, apex, right),
    segmentDist(p, left, right)
  );

  // The hook: a partial ring above the apex, kept to its upper arc.
  const hookCenter = [0.5, 0.285];
  const hookR = 0.072;
  if (y < hookCenter[1] + hookR * 0.35) {
    d = Math.min(d, ringDist(p, hookCenter, hookR));
  }
  // Short stem joining hook to apex.
  d = Math.min(d, segmentDist(p, [0.5, hookCenter[1] + hookR * 0.2], apex));

  const inHanger = d - stroke / 2;
  if (inHanger <= 0) return [...INK, 255];

  return [bg[0], bg[1], bg[2], 255];
}

/** Render at `size` with SS x SS supersampling. */
function render(size, SS = 3) {
  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          const c = shade(x, y);
          // Premultiply so edge pixels blend correctly.
          const al = c[3] / 255;
          r += c[0] * al;
          g += c[1] * al;
          b += c[2] * al;
          a += c[3];
        }
      }
      const n = SS * SS;
      const alpha = a / n;
      const i = (py * size + px) * 4;
      // Un-premultiply back to straight alpha: the accumulated color was
      // weighted by each sample's alpha, so divide by the total alpha
      // weight (a/255), not by the sample count.
      const k = a > 0 ? 255 / a : 0;
      out[i] = Math.round(clamp(r * k, 0, 255));
      out[i + 1] = Math.round(clamp(g * k, 0, 255));
      out[i + 2] = Math.round(clamp(b * k, 0, 255));
      out[i + 3] = Math.round(alpha);
    }
  }
  return out;
}

// ---------------------------------------------------------------- write out

const targets = [
  // Next picks these up automatically from the app directory.
  { file: "app/icon.png", size: 192 },
  { file: "app/apple-icon.png", size: 180 },
  // Referenced explicitly by the web manifest.
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
];

for (const { file, size } of targets) {
  const abs = path.join(process.cwd(), file);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, encodePng(render(size), size));
  console.log(`wrote ${file} (${size}x${size})`);
}
