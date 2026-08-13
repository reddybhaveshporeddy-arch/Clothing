import { prisma } from "./prisma";

/**
 * Recompute wear counters from the log rather than incrementing them.
 *
 * Logging is editable (you can overwrite a day, or delete a day's entry), so
 * derived counters drift if we nudge them. Recomputing from WearLog keeps
 * timesWorn/lastWornDate correct no matter what path changed the history.
 */
export async function recomputeWearStats(opts: {
  itemIds?: number[];
  outfitIds?: number[];
}) {
  const itemIds = [...new Set(opts.itemIds ?? [])];
  const outfitIds = [...new Set((opts.outfitIds ?? []).filter(Boolean))];

  for (const itemId of itemIds) {
    // One item can appear on several rows for the same day only if the same
    // day was logged twice; distinct days is the honest count.
    const logs = await prisma.wearLog.findMany({
      where: { itemId },
      select: { date: true },
      orderBy: { date: "desc" },
    });
    const days = new Set(logs.map((l) => l.date.toISOString().slice(0, 10)));
    await prisma.clothingItem.update({
      where: { id: itemId },
      data: {
        timesWorn: days.size,
        lastWornDate: logs[0]?.date ?? null,
      },
    });
  }

  for (const outfitId of outfitIds) {
    const logs = await prisma.wearLog.findMany({
      where: { outfitId },
      select: { date: true },
      orderBy: { date: "desc" },
    });
    const days = new Set(logs.map((l) => l.date.toISOString().slice(0, 10)));
    const exists = await prisma.outfit.findUnique({ where: { id: outfitId } });
    if (!exists) continue;
    await prisma.outfit.update({
      where: { id: outfitId },
      data: {
        timesWorn: days.size,
        lastWornDate: logs[0]?.date ?? null,
      },
    });
  }
}

/** Local midnight for a "YYYY-MM-DD" key, or for a Date. */
export function normalizeDate(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(input);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dayBounds(date: Date): { gte: Date; lt: Date } {
  const start = normalizeDate(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}
