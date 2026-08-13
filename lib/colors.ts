/**
 * Color utilities for the matching engine.
 *
 * Colors are stored as free text on the item ("black", "washed navy", "#3a2f1b").
 * Everything here is tolerant of that: we normalize to a hue/saturation/lightness
 * reading first, then reason about neutrals and complements numerically so a
 * hand-typed label and a picked hex behave the same way.
 */

export type Hsl = { h: number; s: number; l: number };

const NAMED_HEX: Record<string, string> = {
  black: "#111111",
  white: "#f5f5f5",
  grey: "#8a8a8a",
  gray: "#8a8a8a",
  silver: "#c0c0c0",
  charcoal: "#36393f",
  navy: "#1f2b47",
  brown: "#6b4a2f",
  tan: "#c8a882",
  beige: "#d9c7a7",
  khaki: "#bdb076",
  cream: "#efe6d2",
  olive: "#5c6444",
  sage: "#9caf88",
  red: "#c0392b",
  maroon: "#6d2434",
  burgundy: "#5c1f2b",
  blue: "#2f6fd0",
  "light blue": "#7fb2e8",
  denim: "#3b5f8a",
  teal: "#1f7a76",
  green: "#2e8b57",
  lime: "#8ccf3f",
  yellow: "#e5b833",
  mustard: "#c9a227",
  orange: "#e2761b",
  rust: "#a8482a",
  purple: "#6b4ba3",
  lavender: "#b6a5db",
  pink: "#d977a0",
};

/** Words that describe a shade rather than a hue — stripped before lookup. */
const MODIFIERS = [
  "light",
  "dark",
  "deep",
  "pale",
  "washed",
  "faded",
  "bright",
  "muted",
  "dusty",
  "off",
  "heather",
];

export function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      default:
        h = ((r - g) / d + 4) * 60;
    }
  }
  return { h, s, l };
}

/** Best-effort hex for any stored color string. Falls back to mid grey. */
export function colorToHex(color: string | null | undefined): string {
  if (!color) return "#8a8a8a";
  const raw = color.trim().toLowerCase();
  if (raw.startsWith("#")) {
    const rgb = hexToRgb(raw);
    if (rgb) return raw.length === 4 ? expandShortHex(raw) : raw;
  }
  if (NAMED_HEX[raw]) return NAMED_HEX[raw];

  // "dark olive" / "washed denim" — drop modifiers, then match the remaining words.
  const words = raw.split(/[\s-]+/).filter((w) => !MODIFIERS.includes(w));
  const rejoined = words.join(" ");
  if (NAMED_HEX[rejoined]) return NAMED_HEX[rejoined];
  for (const w of words) {
    if (NAMED_HEX[w]) return NAMED_HEX[w];
  }
  return "#8a8a8a";
}

function expandShortHex(hex: string): string {
  const h = hex.replace(/^#/, "");
  return (
    "#" +
    h
      .split("")
      .map((c) => c + c)
      .join("")
  );
}

export function colorToHsl(color: string): Hsl {
  const rgb = hexToRgb(colorToHex(color));
  if (!rgb) return { h: 0, s: 0, l: 0.5 };
  return rgbToHsl(rgb[0], rgb[1], rgb[2]);
}

/**
 * A color counts as neutral if it carries almost no chroma (black/white/grey),
 * or if it is one of the wearable neutrals — navy, brown, beige, olive — which
 * read as neutral in an outfit even though they are technically saturated.
 */
export function isNeutral(color: string): boolean {
  const raw = color.trim().toLowerCase();
  const words = raw.split(/[\s-]+/).filter((w) => !MODIFIERS.includes(w));
  const NEUTRAL_NAMES = [
    "black",
    "white",
    "grey",
    "gray",
    "silver",
    "charcoal",
    "navy",
    "brown",
    "tan",
    "beige",
    "khaki",
    "cream",
    "olive",
    "denim",
  ];
  if (words.some((w) => NEUTRAL_NAMES.includes(w))) return true;
  if (NEUTRAL_NAMES.includes(words.join(" "))) return true;

  const { s, l } = colorToHsl(color);
  // Desaturated, or very dark / very light regardless of hue.
  return s < 0.18 || l < 0.14 || l > 0.9;
}

/** Loud colors are the ones that fight each other when paired. */
export function isSaturated(color: string): boolean {
  if (isNeutral(color)) return false;
  const { s, l } = colorToHsl(color);
  return s >= 0.45 && l > 0.2 && l < 0.8;
}

/** Shortest distance between two hues, in degrees (0–180). */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Roughly opposite on the wheel — the pairing that intentionally pops. */
export function areComplementary(c1: string, c2: string): boolean {
  const a = colorToHsl(c1);
  const b = colorToHsl(c2);
  const d = hueDistance(a.h, b.h);
  return d >= 145 && d <= 215;
}

/** Neighbours on the wheel — the pairing that reads as one tonal family. */
export function areAnalogous(c1: string, c2: string): boolean {
  const a = colorToHsl(c1);
  const b = colorToHsl(c2);
  return hueDistance(a.h, b.h) <= 40;
}

/** Collapse near-identical colors so "black" and "#111" count once. */
export function distinctColors(colors: string[]): string[] {
  const out: string[] = [];
  for (const c of colors) {
    if (!c) continue;
    const hex = colorToHex(c).toLowerCase();
    if (!out.some((o) => colorToHex(o).toLowerCase() === hex)) out.push(c);
  }
  return out;
}

/** Readable text color for a swatch background. */
export function contrastText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? "#111111" : "#ffffff";
}
