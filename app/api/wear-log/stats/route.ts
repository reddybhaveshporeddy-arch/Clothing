import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeItem, serializeOutfit, dateKey } from "@/lib/serialize";
import { daysBetween } from "@/lib/matching";
import { withProfile } from "@/lib/profile";
import { WASH_THRESHOLD_BY_CATEGORY, type Category } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const [logs, items, outfits, itemLogs] = await Promise.all([
    prisma.wearLog.findMany({
      where: { profileId: ctx.profileId },
      select: { date: true },
    }),
    prisma.clothingItem.findMany({ where: { profileId: ctx.profileId } }),
    prisma.outfit.findMany({
      where: { profileId: ctx.profileId, disliked: false },
      include: { items: { include: { item: true } } },
    }),
    prisma.wearLog.findMany({
      where: { profileId: ctx.profileId, itemId: { not: null } },
      select: { itemId: true, date: true },
    }),
  ]);

  const loggedDays = [...new Set(logs.map((l) => dateKey(l.date)))].sort();

  const today = new Date();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Streak counts back from today; a day logged yesterday but not today still
  // counts, so the streak doesn't visibly break before you've dressed.
  const daySet = new Set(loggedDays);
  let streak = 0;
  const cursor = new Date(now);
  if (!daySet.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daySet.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const worn = items.filter((i) => i.timesWorn > 0);
  const mostWorn = [...worn].sort((a, b) => b.timesWorn - a.timesWorn)[0];

  // "Neglected" = never worn, or not worn in 14+ days.
  const neglected = items
    .filter((i) => {
      if (!i.lastWornDate) return true;
      return daysBetween(i.lastWornDate, now) >= 14;
    })
    .sort((a, b) => {
      const da = a.lastWornDate ? daysBetween(a.lastWornDate, now) : 9999;
      const db = b.lastWornDate ? daysBetween(b.lastWornDate, now) : 9999;
      return db - da;
    });

  const underused = neglected.filter((i) => {
    if (!i.lastWornDate) return true;
    return daysBetween(i.lastWornDate, now) >= 21;
  });

  // Wears since wash: distinct worn days for each item, counting only days
  // after its last mark-as-washed (or all-time if never marked).
  const wearDatesByItem = new Map<number, string[]>();
  for (const log of itemLogs) {
    if (log.itemId == null) continue;
    const key = dateKey(log.date);
    const arr = wearDatesByItem.get(log.itemId) ?? [];
    if (!arr.includes(key)) arr.push(key);
    wearDatesByItem.set(log.itemId, arr);
  }

  const laundryDue = items
    .map((i) => {
      const threshold =
        WASH_THRESHOLD_BY_CATEGORY[i.category as Category] ?? 4;
      const washedKey = i.lastWashedDate ? dateKey(i.lastWashedDate) : null;
      const dates = wearDatesByItem.get(i.id) ?? [];
      const wearsSinceWash = washedKey
        ? dates.filter((d) => d > washedKey).length
        : dates.length;
      return { item: i, wearsSinceWash, threshold };
    })
    .filter((x) => x.wearsSinceWash >= x.threshold)
    .sort((a, b) => b.wearsSinceWash - b.threshold - (a.wearsSinceWash - a.threshold));

  const favoriteOutfit = [...outfits].sort((a, b) => b.timesWorn - a.timesWorn)[0];

  const colorCounts = new Map<string, number>();
  for (const i of items) {
    const key = i.primaryColor.toLowerCase().trim();
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }

  const categoryCounts = new Map<string, number>();
  for (const i of items) {
    categoryCounts.set(i.category, (categoryCounts.get(i.category) || 0) + 1);
  }

  return NextResponse.json({
    totalOutfitsLogged: loggedDays.length,
    totalItems: items.length,
    totalSavedOutfits: outfits.length,
    streak,
    mostWornItem: mostWorn ? serializeItem(mostWorn) : null,
    leastWornItems: neglected.slice(0, 8).map(serializeItem),
    underusedItems: underused.slice(0, 8).map(serializeItem),
    laundryDueItems: laundryDue.slice(0, 8).map((x) => serializeItem(x.item)),
    favoriteOutfit: favoriteOutfit?.timesWorn
      ? serializeOutfit(favoriteOutfit)
      : null,
    colorBreakdown: [...colorCounts.entries()]
      .map(([color, count]) => ({ color, count }))
      .sort((a, b) => b.count - a.count),
    categoryBreakdown: [...categoryCounts.entries()].map(
      ([category, count]) => ({ category, count })
    ),
    loggedDays,
  });
}
