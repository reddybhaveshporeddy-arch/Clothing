/**
 * Prisma stores arrays as JSON strings (SQLite has no array type). These
 * helpers are the single place that translation happens, so nothing else has
 * to remember whether it's holding a string or an array.
 */

import type { EngineItem } from "./matching";

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function stringifyArray(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(String));
  if (typeof value === "string") {
    // Already-encoded JSON passes through untouched.
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return JSON.stringify(parsed.map(String));
    } catch {
      /* fall through */
    }
    return JSON.stringify(value ? [value] : []);
  }
  return "[]";
}

export type ClientItem = {
  id: number;
  name: string;
  category: string;
  type: string;
  primaryColor: string;
  secondaryColor: string | null;
  styleTags: string[];
  season: string;
  notes: string | null;
  photoPath: string;
  timesWorn: number;
  lastWornDate: string | null;
  lastWashedDate: string | null;
  createdAt: string;
};

type RawItem = {
  id: number;
  name: string;
  category: string;
  type: string;
  primaryColor: string;
  secondaryColor: string | null;
  styleTags: string;
  season: string;
  notes: string | null;
  photoPath: string;
  timesWorn: number;
  lastWornDate: Date | null;
  lastWashedDate?: Date | null;
  createdAt: Date;
};

export function serializeItem(item: RawItem): ClientItem {
  return {
    ...item,
    styleTags: parseJsonArray(item.styleTags),
    lastWornDate: item.lastWornDate ? item.lastWornDate.toISOString() : null,
    lastWashedDate: item.lastWashedDate
      ? item.lastWashedDate.toISOString()
      : null,
    createdAt: item.createdAt.toISOString(),
  };
}

export function toEngineItem(item: RawItem): EngineItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    type: item.type,
    primaryColor: item.primaryColor,
    secondaryColor: item.secondaryColor,
    styleTags: parseJsonArray(item.styleTags),
    season: item.season,
    notes: item.notes,
    timesWorn: item.timesWorn,
    lastWornDate: item.lastWornDate,
    photoPath: item.photoPath,
  };
}

export type ClientOutfit = {
  id: number;
  name: string;
  score: number;
  styleNote: string | null;
  tags: string[];
  timesWorn: number;
  lastWornDate: string | null;
  createdAt: string;
  items: { id: number; slot: string; item: ClientItem }[];
};

export function serializeOutfit(outfit: {
  id: number;
  name: string;
  score: number;
  styleNote: string | null;
  tags: string;
  timesWorn: number;
  lastWornDate: Date | null;
  createdAt: Date;
  items: { id: number; slot: string; item: RawItem }[];
}): ClientOutfit {
  return {
    id: outfit.id,
    name: outfit.name,
    score: outfit.score,
    styleNote: outfit.styleNote,
    tags: parseJsonArray(outfit.tags),
    timesWorn: outfit.timesWorn,
    lastWornDate: outfit.lastWornDate ? outfit.lastWornDate.toISOString() : null,
    createdAt: outfit.createdAt.toISOString(),
    items: outfit.items.map((oi) => ({
      id: oi.id,
      slot: oi.slot,
      item: serializeItem(oi.item),
    })),
  };
}

export type ClientProfile = {
  styleVibe: string;
  preferredColors: string[];
  fit: string;
  occasion: string;
  avoidColors: string[];
  mustInclude: string[];
};

export function serializeProfile(p: {
  styleVibe: string;
  preferredColors: string;
  fit: string;
  occasion: string;
  avoidColors: string;
  mustInclude: string | null;
}): ClientProfile {
  return {
    styleVibe: p.styleVibe,
    preferredColors: parseJsonArray(p.preferredColors),
    fit: p.fit,
    occasion: p.occasion,
    avoidColors: parseJsonArray(p.avoidColors),
    mustInclude: parseJsonArray(p.mustInclude),
  };
}

/** Local-date key ("2026-08-11") — avoids UTC drift on calendar cells. */
export function dateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "2026-08-11" as local midnight rather than UTC midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
