/**
 * Outfit matching engine.
 *
 * Scoring (max 100, floor 0):
 *   Color harmony        0–40
 *   Style consistency    0–30
 *   Season appropriate   0–15
 *   User preference      0–15
 *   Recency penalty      up to −20
 */

import {
  areAnalogous,
  areComplementary,
  distinctColors,
  isNeutral,
  isSaturated,
} from "./colors";
import { OUTFIT_NAME_ADJECTIVES } from "./constants";

export type EngineItem = {
  id: number;
  name: string;
  category: string;
  type: string;
  primaryColor: string;
  secondaryColor: string | null;
  styleTags: string[];
  season: string;
  notes?: string | null;
  timesWorn: number;
  lastWornDate: Date | string | null;
  photoPath: string;
};

export type EngineProfile = {
  styleVibe: string;
  preferredColors: string[];
  fit: string;
  occasion: string;
  avoidColors: string[];
  mustInclude: string[];
} | null;

export type ScoreBreakdown = {
  color: number;
  style: number;
  season: number;
  preference: number;
  recencyPenalty: number;
  total: number;
  notes: string[];
};

export type ScoredOutfit = {
  name: string;
  score: number;
  breakdown: ScoreBreakdown;
  items: { item: EngineItem; slot: string }[];
};

// ---------------------------------------------------------------- season

export type SeasonKey = "summer" | "fall-winter" | "spring";

export function currentSeason(date = new Date()): SeasonKey {
  const m = date.getMonth(); // 0-indexed
  if (m >= 2 && m <= 4) return "spring"; // Mar–May
  if (m >= 5 && m <= 7) return "summer"; // Jun–Aug
  return "fall-winter"; // Sep–Feb
}

/** Adjacent seasons still read as "fine", just not ideal. */
const SEASON_NEIGHBOURS: Record<SeasonKey, string[]> = {
  spring: ["summer", "fall-winter"],
  summer: ["spring"],
  "fall-winter": ["spring"],
};

function seasonScoreForItem(itemSeason: string, season: SeasonKey): number {
  if (itemSeason === "all") return 15;
  if (itemSeason === season) return 15;
  if (SEASON_NEIGHBOURS[season].includes(itemSeason)) return 8;
  return 0;
}

// ---------------------------------------------------------------- color

export function scoreColorHarmony(items: EngineItem[]): {
  score: number;
  note: string;
} {
  const all: string[] = [];
  for (const it of items) {
    all.push(it.primaryColor);
    if (it.secondaryColor) all.push(it.secondaryColor);
  }
  const distinct = distinctColors(all);
  if (distinct.length === 0) return { score: 20, note: "No color data" };

  const nonNeutral = distinct.filter((c) => !isNeutral(c));
  const loud = distinct.filter((c) => isSaturated(c));

  let score: number;
  let note: string;

  if (nonNeutral.length === 0) {
    score = 40;
    note = "All neutrals — always safe";
  } else if (nonNeutral.length === 1) {
    score = 38;
    note = "One color against neutrals";
  } else if (loud.length >= 2) {
    // Two or more loud colors: only forgiven if they're a deliberate pairing.
    let complementary = false;
    let analogous = false;
    for (let i = 0; i < loud.length; i++) {
      for (let j = i + 1; j < loud.length; j++) {
        if (areComplementary(loud[i], loud[j])) complementary = true;
        else if (areAnalogous(loud[i], loud[j])) analogous = true;
      }
    }
    if (complementary) {
      score = 30;
      note = "Bold complementary pairing";
    } else if (analogous) {
      score = 26;
      note = "Colors sit in the same family";
    } else {
      score = 14;
      note = "Two bright colors competing";
    }
  } else {
    score = 30;
    note = "Mostly neutral with color accents";
  }

  // Cap on total distinct colors: max 3 for a high score.
  if (distinct.length > 3) {
    const over = distinct.length - 3;
    score = Math.max(6, score - over * 8);
    note = `${distinct.length} colors — busy`;
  }

  return { score: Math.round(score), note };
}

// ---------------------------------------------------------------- style

const CONFLICTING: Array<[string, string]> = [["Preppy", "Streetwear"]];

export function scoreStyleConsistency(items: EngineItem[]): {
  score: number;
  note: string;
} {
  const tagSets = items.map((i) => i.styleTags || []).filter((t) => t.length);
  if (tagSets.length === 0) return { score: 15, note: "No style tags" };

  const counts = new Map<string, number>();
  for (const set of tagSets) {
    for (const t of set) counts.set(t, (counts.get(t) || 0) + 1);
  }

  // A tag shared by every tagged item means the outfit reads as one style.
  const unifying = [...counts.entries()].filter(
    ([, n]) => n === tagSets.length
  );

  for (const [a, b] of CONFLICTING) {
    const hasA = tagSets.some((s) => s.includes(a) && !s.includes(b));
    const hasB = tagSets.some((s) => s.includes(b) && !s.includes(a));
    if (hasA && hasB) {
      return { score: 8, note: `${a} and ${b} pull against each other` };
    }
  }

  if (unifying.length > 0) {
    return { score: 30, note: `All ${unifying[0][0].toLowerCase()}` };
  }

  // Casual blends with anything — treat a casual overlap as a soft match.
  const casualEverywhere = tagSets.every(
    (s) => s.includes("Casual") || s.includes("Streetwear")
  );
  if (casualEverywhere) {
    return { score: 22, note: "Casual and streetwear mix" };
  }

  return { score: 16, note: "Mixed styles" };
}

// ---------------------------------------------------------------- preference

export function scorePreference(
  items: EngineItem[],
  profile: EngineProfile
): { score: number; note: string } {
  if (!profile) return { score: 8, note: "No style profile yet" };

  let score = 0;
  const notes: string[] = [];

  // Preferred colors — up to 8 points.
  const preferred = profile.preferredColors.map((c) => c.toLowerCase());
  const itemColors = items.map((i) => i.primaryColor.toLowerCase());
  const matches = itemColors.filter((c) =>
    preferred.some((p) => colorMatchesGroup(c, p))
  ).length;
  if (items.length > 0) {
    score += Math.min(8, Math.round((matches / items.length) * 8));
    if (matches > 0) notes.push("your colors");
  }

  // Vibe match — up to 7 points.
  if (profile.styleVibe && profile.styleVibe !== "mixed") {
    const vibeTag = capitalize(profile.styleVibe);
    const withVibe = items.filter((i) => i.styleTags?.includes(vibeTag)).length;
    if (items.length > 0) {
      score += Math.min(7, Math.round((withVibe / items.length) * 7));
      if (withVibe > 0) notes.push(`${profile.styleVibe} vibe`);
    }
  } else {
    score += 4; // "mixed" is satisfied by anything
  }

  // Avoided colors are a hard-ish penalty, applied inside this bucket.
  const avoid = profile.avoidColors.map((c) => c.toLowerCase());
  const hasAvoided = itemColors.some((c) =>
    avoid.some((a) => colorMatchesGroup(c, a))
  );
  if (hasAvoided) {
    score = Math.max(0, score - 12);
    notes.push("includes a color you avoid");
  }

  return {
    score: Math.max(0, Math.min(15, score)),
    note: notes.join(", ") || "Neutral fit for your profile",
  };
}

/** Quiz colors include groups ("earth", "bright") that cover several colors. */
function colorMatchesGroup(color: string, group: string): boolean {
  const c = color.toLowerCase();
  if (group === "earth") {
    return ["brown", "beige", "tan", "olive", "cream", "khaki", "rust"].some(
      (e) => c.includes(e)
    );
  }
  if (group === "bright") {
    return isSaturated(color);
  }
  return c.includes(group);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------- recency

export function recencyPenalty(
  items: EngineItem[],
  now = new Date()
): { penalty: number; note: string } {
  let worst = 0;
  let recentCount = 0;
  for (const it of items) {
    if (!it.lastWornDate) continue;
    const days = daysBetween(new Date(it.lastWornDate), now);
    if (days <= 3) {
      recentCount++;
      // Worn today = 20, 1 day ago = 15, 2 = 10, 3 = 5.
      worst = Math.max(worst, 20 - Math.min(3, days) * 5);
    }
  }
  const penalty = Math.min(20, worst + (recentCount > 1 ? 4 : 0));
  return {
    penalty,
    note: recentCount
      ? `${recentCount} item${recentCount > 1 ? "s" : ""} worn recently`
      : "",
  };
}

export function daysBetween(a: Date, b: Date): number {
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round(Math.abs(d2 - d1) / 86400000);
}

// ---------------------------------------------------------------- scoring

export function scoreOutfit(
  items: EngineItem[],
  profile: EngineProfile,
  now = new Date()
): ScoreBreakdown {
  const season = currentSeason(now);

  const color = scoreColorHarmony(items);
  const style = scoreStyleConsistency(items);
  const pref = scorePreference(items, profile);
  const rec = recencyPenalty(items, now);

  const seasonScore = items.length
    ? Math.round(
        items.reduce((sum, i) => sum + seasonScoreForItem(i.season, season), 0) /
          items.length
      )
    : 0;

  const total = Math.max(
    0,
    Math.min(
      100,
      color.score + style.score + seasonScore + pref.score - rec.penalty
    )
  );

  const notes = [color.note, style.note, pref.note, rec.note].filter(Boolean);

  return {
    color: color.score,
    style: style.score,
    season: seasonScore,
    preference: pref.score,
    recencyPenalty: rec.penalty,
    total,
    notes,
  };
}

// ---------------------------------------------------------------- generation

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Deterministic-ish name from the outfit's dominant style + a counter. */
export function nameOutfit(items: EngineItem[], index: number): string {
  const tagCounts = new Map<string, number>();
  for (const it of items) {
    for (const t of it.styleTags || []) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }
  const dominant =
    [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Casual";
  const adj = OUTFIT_NAME_ADJECTIVES[index % OUTFIT_NAME_ADJECTIVES.length];
  return `${adj} ${dominant} #${index + 1}`;
}

export type GenerateOptions = {
  /** Item ids that must not appear (e.g. from a disliked outfit). */
  excludeItemIds?: number[];
  /** Signature strings ("3-7-12") already shown, to keep suggestions distinct. */
  excludeSignatures?: string[];
  count?: number;
  now?: Date;
  /** Skip season filtering — used by manual mode scoring. */
  ignoreSeason?: boolean;
};

export function outfitSignature(items: { item: EngineItem }[]): string {
  return items
    .map((i) => i.item.id)
    .sort((a, b) => a - b)
    .join("-");
}

/**
 * Build candidate outfits and return the best `count`, sorted by score.
 *
 * Rather than scoring every top×bottom×outerwear×shoes combination (which
 * explodes on a large wardrobe), we cap the pool per slot by a cheap
 * pre-ranking, then score the full cross-product of that capped pool.
 */
export function generateOutfits(
  allItems: EngineItem[],
  profile: EngineProfile,
  opts: GenerateOptions = {}
): ScoredOutfit[] {
  const {
    excludeItemIds = [],
    excludeSignatures = [],
    count = 5,
    now = new Date(),
    ignoreSeason = false,
  } = opts;

  const season = currentSeason(now);
  const excluded = new Set(excludeItemIds);

  const usable = allItems.filter((i) => {
    if (excluded.has(i.id)) return false;
    if (ignoreSeason) return true;
    // Keep anything not actively wrong for the season.
    return seasonScoreForItem(i.season, season) > 0;
  });

  const byCategory = (cat: string) => usable.filter((i) => i.category === cat);

  const tops = capPool(byCategory("top"), profile, 8);
  const bottoms = capPool(byCategory("bottom"), profile, 6);
  const outerwear = capPool(byCategory("outerwear"), profile, 4);
  const shoes = capPool(byCategory("shoes"), profile, 4);

  if (tops.length === 0 || bottoms.length === 0) return [];

  // Outerwear is optional, and less relevant in summer.
  const outerChoices: (EngineItem | null)[] =
    season === "summer" ? [null, ...outerwear.slice(0, 2)] : [null, ...outerwear];
  const shoeChoices: (EngineItem | null)[] = shoes.length ? [...shoes] : [null];

  const seen = new Set(excludeSignatures);
  const candidates: ScoredOutfit[] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const outer of outerChoices) {
        for (const shoe of shoeChoices) {
          const entries: { item: EngineItem; slot: string }[] = [
            { item: top, slot: "top" },
            { item: bottom, slot: "bottom" },
          ];
          if (outer) entries.push({ item: outer, slot: "outerwear" });
          if (shoe) entries.push({ item: shoe, slot: "shoes" });

          const sig = outfitSignature(entries);
          if (seen.has(sig)) continue;

          const breakdown = scoreOutfit(
            entries.map((e) => e.item),
            profile,
            now
          );
          candidates.push({
            name: "",
            score: breakdown.total,
            breakdown,
            items: entries,
          });
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  // Diversify: don't return five variations that share the same top.
  const chosen: ScoredOutfit[] = [];
  const topUse = new Map<number, number>();
  const maxPerTop = Math.max(1, Math.ceil(count / 3));

  for (const pass of [1, 2]) {
    for (const cand of candidates) {
      if (chosen.length >= count) break;
      const sig = outfitSignature(cand.items);
      if (seen.has(sig)) continue;
      const topId = cand.items.find((i) => i.slot === "top")!.item.id;
      if (pass === 1 && (topUse.get(topId) || 0) >= maxPerTop) continue;
      seen.add(sig);
      topUse.set(topId, (topUse.get(topId) || 0) + 1);
      chosen.push(cand);
    }
    if (chosen.length >= count) break;
  }

  return chosen.map((c, i) => ({ ...c, name: nameOutfit(c.items.map((x) => x.item), i) }));
}

/** Sentinel id for a not-yet-owned item being test-fit against the wardrobe. */
export const PHANTOM_ITEM_ID = -1;

/**
 * Score a scanned (not-yet-owned) item against the real wardrobe: find the
 * best outfits it could slot into, the same way outfit generation works, but
 * with this one item pinned into its category slot instead of drawn from the
 * closet. Every returned outfit includes the phantom item.
 */
export function matchAgainstWardrobe(
  phantom: EngineItem,
  wardrobe: EngineItem[],
  profile: EngineProfile,
  now = new Date()
): ScoredOutfit[] {
  const season = currentSeason(now);
  const usable = wardrobe.filter(
    (i) => seasonScoreForItem(i.season, season) > 0
  );
  const byCategory = (cat: string) => usable.filter((i) => i.category === cat);

  const tops =
    phantom.category === "top" ? [phantom] : capPool(byCategory("top"), profile, 5);
  const bottoms =
    phantom.category === "bottom"
      ? [phantom]
      : capPool(byCategory("bottom"), profile, 5);
  const outerwear =
    phantom.category === "outerwear"
      ? [phantom]
      : capPool(byCategory("outerwear"), profile, 3);
  const shoes =
    phantom.category === "shoes" ? [phantom] : capPool(byCategory("shoes"), profile, 3);

  if (tops.length === 0 || bottoms.length === 0) return [];

  const outerChoices: (EngineItem | null)[] =
    phantom.category === "outerwear" ? [phantom] : [null, ...outerwear];
  const shoeChoices: (EngineItem | null)[] =
    phantom.category === "shoes" ? [phantom] : shoes.length ? shoes : [null];

  const candidates: ScoredOutfit[] = [];
  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const outer of outerChoices) {
        for (const shoe of shoeChoices) {
          const entries: { item: EngineItem; slot: string }[] = [
            { item: top, slot: "top" },
            { item: bottom, slot: "bottom" },
          ];
          if (outer) entries.push({ item: outer, slot: "outerwear" });
          if (shoe) entries.push({ item: shoe, slot: "shoes" });
          if (phantom.category === "accessory") {
            entries.push({ item: phantom, slot: "accessory" });
          }
          if (!entries.some((e) => e.item.id === phantom.id)) continue;

          const breakdown = scoreOutfit(entries.map((e) => e.item), profile, now);
          candidates.push({ name: "", score: breakdown.total, breakdown, items: entries });
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const top: ScoredOutfit[] = [];
  for (const c of candidates) {
    const sig = outfitSignature(c.items);
    if (seen.has(sig)) continue;
    seen.add(sig);
    top.push(c);
    if (top.length >= 3) break;
  }
  return top;
}

/**
 * Cheap per-item pre-ranking so the cross-product stays small: favour items
 * that match the profile and haven't been worn in the last few days, with a
 * little jitter so repeated generations aren't identical.
 */
export function capPool(
  items: EngineItem[],
  profile: EngineProfile,
  limit: number
): EngineItem[] {
  if (items.length <= limit) return shuffle(items);
  const scored = items.map((i) => {
    const pref = scorePreference([i], profile).score;
    const { penalty } = recencyPenalty([i]);
    return { i, s: pref - penalty + Math.random() * 6 };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((s) => s.i);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fallback style note when no Anthropic API key is configured. */
export function localStyleNote(
  items: EngineItem[],
  breakdown: ScoreBreakdown
): string {
  const top = items.find((i) => i.category === "top");
  const bottom = items.find((i) => i.category === "bottom");
  const outer = items.find((i) => i.category === "outerwear");

  const base =
    top && bottom
      ? `The ${top.primaryColor} ${top.type.toLowerCase()} keeps this simple against the ${bottom.primaryColor} ${bottom.type.toLowerCase()}.`
      : "Solid, easy combination.";

  const tips = [
    outer
      ? `Leave the ${outer.type.toLowerCase()} open so the layers still read.`
      : "Cuff the bottoms once if you want a cleaner break at the shoe.",
    breakdown.color >= 35
      ? "The neutral base means you can add one loud accessory without it getting busy."
      : "Keep accessories neutral so the colors don't fight.",
    "Tuck the front of the top slightly if you want more shape.",
  ];
  return `${base} ${pick(tips)}`;
}
