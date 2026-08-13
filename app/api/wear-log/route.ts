import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeItem, dateKey } from "@/lib/serialize";
import { dayBounds, normalizeDate, recomputeWearStats } from "@/lib/wear";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

/**
 * GET /api/wear-log?from=2026-08-01&to=2026-08-31
 * Returns one entry per logged day, with the outfit and the items worn.
 */
export async function GET(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  const where: Record<string, unknown> = { profileId: ctx.profileId };
  if (from || to) {
    where.date = {
      ...(from ? { gte: normalizeDate(from) } : {}),
      ...(to ? { lt: addDays(normalizeDate(to), 1) } : {}),
    };
  }

  const logs = await prisma.wearLog.findMany({
    where,
    orderBy: { date: "desc" },
    include: { item: true, outfit: true },
  });

  // Collapse the per-item rows back into one entry per day.
  const byDay = new Map<
    string,
    {
      date: string;
      outfitId: number | null;
      outfitName: string | null;
      items: ReturnType<typeof serializeItem>[];
    }
  >();

  for (const log of logs) {
    const key = dateKey(log.date);
    let entry = byDay.get(key);
    if (!entry) {
      entry = {
        date: key,
        outfitId: log.outfitId ?? null,
        outfitName: log.outfit?.name ?? null,
        items: [],
      };
      byDay.set(key, entry);
    }
    if (log.outfitId && !entry.outfitId) {
      entry.outfitId = log.outfitId;
      entry.outfitName = log.outfit?.name ?? null;
    }
    if (log.item && !entry.items.some((i) => i.id === log.item!.id)) {
      entry.items.push(serializeItem(log.item));
    }
  }

  return NextResponse.json({ days: [...byDay.values()] });
}

/**
 * POST /api/wear-log
 * Body: { date: "2026-08-11", outfitId?: number, itemIds?: number[] }
 * Logging a day replaces whatever this profile had logged for it.
 */
export async function POST(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const body = await req.json().catch(() => ({}));
  const date = normalizeDate(String(body.date || new Date().toISOString()));
  const outfitId = body.outfitId != null ? Number(body.outfitId) : null;

  let itemIds: number[] = Array.isArray(body.itemIds)
    ? body.itemIds.map(Number).filter(Number.isFinite)
    : [];

  if (outfitId != null) {
    const outfit = await prisma.outfit.findFirst({
      where: { id: outfitId, profileId: ctx.profileId },
      include: { items: true },
    });
    if (!outfit) {
      return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
    }
    itemIds = outfit.items.map((i) => i.itemId);
  } else if (itemIds.length > 0) {
    // Logging loose items — make sure they're all this profile's.
    const owned = await prisma.clothingItem.count({
      where: { id: { in: itemIds }, profileId: ctx.profileId },
    });
    if (owned !== new Set(itemIds).size) {
      return NextResponse.json(
        { error: "One or more items no longer exist" },
        { status: 400 }
      );
    }
  }

  if (outfitId == null && itemIds.length === 0) {
    return NextResponse.json(
      { error: "Provide an outfitId or at least one itemId" },
      { status: 400 }
    );
  }

  // Scoped to this profile — clearing your day must never touch anyone else's.
  const dayFilter = { profileId: ctx.profileId, date: dayBounds(date) };

  // Everything previously touched by this day needs its counters refreshed too.
  const existing = await prisma.wearLog.findMany({
    where: dayFilter,
    select: { itemId: true, outfitId: true },
  });

  await prisma.wearLog.deleteMany({ where: dayFilter });

  if (itemIds.length > 0) {
    await prisma.wearLog.createMany({
      data: itemIds.map((itemId) => ({
        profileId: ctx.profileId,
        date,
        itemId,
        outfitId,
      })),
    });
  } else if (outfitId != null) {
    await prisma.wearLog.create({
      data: { profileId: ctx.profileId, date, outfitId },
    });
  }

  await recomputeWearStats({
    itemIds: [
      ...itemIds,
      ...existing.map((e) => e.itemId).filter((v): v is number => v != null),
    ],
    outfitIds: [
      ...(outfitId != null ? [outfitId] : []),
      ...existing.map((e) => e.outfitId).filter((v): v is number => v != null),
    ],
  });

  return NextResponse.json({ ok: true, date: dateKey(date) }, { status: 201 });
}

/** DELETE /api/wear-log?date=2026-08-11 — clear a day. */
export async function DELETE(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const dateParam = req.nextUrl.searchParams.get("date");
  if (!dateParam) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }
  const date = normalizeDate(dateParam);
  const dayFilter = { profileId: ctx.profileId, date: dayBounds(date) };

  const existing = await prisma.wearLog.findMany({
    where: dayFilter,
    select: { itemId: true, outfitId: true },
  });
  await prisma.wearLog.deleteMany({ where: dayFilter });

  await recomputeWearStats({
    itemIds: existing.map((e) => e.itemId).filter((v): v is number => v != null),
    outfitIds: existing
      .map((e) => e.outfitId)
      .filter((v): v is number => v != null),
  });

  return NextResponse.json({ ok: true });
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
