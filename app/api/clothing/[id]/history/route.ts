import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/serialize";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

/** Every day a single item was worn — powers the mini calendar on its card. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const itemId = Number(params.id);
  const logs = await prisma.wearLog.findMany({
    where: { itemId, profileId: ctx.profileId },
    orderBy: { date: "desc" },
    include: { outfit: { select: { id: true, name: true } } },
  });

  const seen = new Set<string>();
  const days: { date: string; outfitId: number | null; outfitName: string | null }[] =
    [];
  for (const log of logs) {
    const key = dateKey(log.date);
    if (seen.has(key)) continue;
    seen.add(key);
    days.push({
      date: key,
      outfitId: log.outfit?.id ?? null,
      outfitName: log.outfit?.name ?? null,
    });
  }

  return NextResponse.json({ days });
}
