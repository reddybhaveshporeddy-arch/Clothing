import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeItem, serializeProfile, toEngineItem } from "@/lib/serialize";
import { generateOutfits, outfitSignature } from "@/lib/matching";
import { styleNote } from "@/lib/claude";
import { dayBounds } from "@/lib/wear";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

type Weather = {
  tempC: number;
  tempF: number;
  code: number;
  label: string;
  precipitationChance: number;
};

const WEATHER_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorms",
};

/** Open-Meteo — no API key required. Returns null on any failure. */
async function fetchWeather(
  lat: number,
  lon: number
): Promise<Weather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code&daily=precipitation_probability_max` +
      `&temperature_unit=celsius&forecast_days=1&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = await res.json();
    const tempC = Number(data?.current?.temperature_2m);
    const code = Number(data?.current?.weather_code ?? 0);
    if (!Number.isFinite(tempC)) return null;
    return {
      tempC: Math.round(tempC),
      tempF: Math.round((tempC * 9) / 5 + 32),
      code,
      label: WEATHER_LABELS[code] || "Mild",
      precipitationChance: Number(
        data?.daily?.precipitation_probability_max?.[0] ?? 0
      ),
    };
  } catch {
    return null;
  }
}

/**
 * Nudge the ranking with today's weather: below 12°C an outfit without
 * outerwear loses points, above 24°C outerwear becomes a liability, and rain
 * favours items that aren't summer-only.
 */
function weatherAdjust(
  outfit: { items: { slot: string }[]; score: number },
  weather: Weather | null
): { score: number; note: string | null } {
  if (!weather) return { score: outfit.score, note: null };
  const hasOuter = outfit.items.some((i) => i.slot === "outerwear");

  if (weather.tempC <= 12) {
    return hasOuter
      ? { score: Math.min(100, outfit.score + 6), note: "Layered for the cold" }
      : { score: Math.max(0, outfit.score - 10), note: "You'll want a layer over this" };
  }
  if (weather.tempC >= 24) {
    return hasOuter
      ? { score: Math.max(0, outfit.score - 8), note: "Might be too warm for the jacket" }
      : { score: Math.min(100, outfit.score + 4), note: "Light enough for the heat" };
  }
  if (weather.precipitationChance >= 50 && !hasOuter) {
    return { score: Math.max(0, outfit.score - 4), note: "Rain likely — grab a jacket" };
  }
  return { score: outfit.score, note: null };
}

export async function GET(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const sp = req.nextUrl.searchParams;
  const latParam = sp.get("lat");
  const lonParam = sp.get("lon");
  // Guard on the raw params: Number(null) is 0, which would silently ask for
  // the weather at lat 0 / lon 0 whenever the browser gave us no location.
  const lat = latParam === null ? NaN : Number(latParam);
  const lon = lonParam === null ? NaN : Number(lonParam);

  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180;

  const weather = hasCoords ? await fetchWeather(lat, lon) : null;

  const today = new Date();
  const [rawItems, rawProfile, todaysLog, recentLogs] = await Promise.all([
    prisma.clothingItem.findMany({ where: { profileId: ctx.profileId } }),
    prisma.styleProfile.findUnique({ where: { profileId: ctx.profileId } }),
    prisma.wearLog.findMany({
      where: { profileId: ctx.profileId, date: dayBounds(today) },
      include: { item: true, outfit: true },
    }),
    prisma.wearLog.findMany({
      where: { profileId: ctx.profileId, date: { gte: addDays(today, -3) } },
      select: { outfitId: true },
    }),
  ]);

  // Already dressed? Show what's logged instead of suggesting over it.
  if (todaysLog.length > 0) {
    const items = todaysLog
      .map((l) => l.item)
      .filter((i): i is NonNullable<typeof i> => Boolean(i));
    return NextResponse.json({
      alreadyLogged: true,
      weather,
      outfit: {
        name: todaysLog[0].outfit?.name ?? "Today's fit",
        outfitId: todaysLog[0].outfitId,
        items: items.map((i) => ({ slot: i.category, item: serializeItem(i) })),
      },
    });
  }

  const items = rawItems.map(toEngineItem);
  const profile = rawProfile ? serializeProfile(rawProfile) : null;
  const recentOutfitIds = new Set(
    recentLogs.map((l) => l.outfitId).filter(Boolean)
  );

  const suggestions = generateOutfits(items, profile, { count: 6 });
  if (suggestions.length === 0) {
    return NextResponse.json({
      weather,
      outfit: null,
      reason: "Add at least one top and one bottom to get a suggestion.",
    });
  }

  const adjusted = suggestions
    .map((s) => {
      const { score, note } = weatherAdjust(s, weather);
      return { ...s, score, weatherNote: note };
    })
    .sort((a, b) => b.score - a.score);

  const best = adjusted[0];
  const rawById = new Map(rawItems.map((i) => [i.id, i]));
  const note = await styleNote(
    best.items.map((i) => i.item),
    profile,
    best.breakdown
  );

  return NextResponse.json({
    weather,
    recentlyWornOutfitCount: recentOutfitIds.size,
    outfit: {
      name: best.name,
      score: best.score,
      breakdown: best.breakdown,
      styleNote: note.note,
      weatherNote: best.weatherNote,
      signature: outfitSignature(best.items),
      items: best.items.map((e) => ({
        slot: e.slot,
        item: serializeItem(rawById.get(e.item.id)!),
      })),
    },
  });
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}
