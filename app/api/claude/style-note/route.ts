import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProfile, toEngineItem } from "@/lib/serialize";
import { scoreOutfit } from "@/lib/matching";
import { styleNote } from "@/lib/claude";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const body = await req.json().catch(() => ({}));
  const itemIds: number[] = Array.isArray(body.itemIds)
    ? body.itemIds.map(Number).filter(Number.isFinite)
    : [];

  if (itemIds.length === 0) {
    return NextResponse.json({ error: "itemIds is required" }, { status: 400 });
  }

  const [rawItems, rawProfile] = await Promise.all([
    prisma.clothingItem.findMany({
      where: { id: { in: itemIds }, profileId: ctx.profileId },
    }),
    prisma.styleProfile.findUnique({ where: { profileId: ctx.profileId } }),
  ]);

  if (rawItems.length === 0) {
    return NextResponse.json({ error: "No matching items" }, { status: 404 });
  }

  const items = rawItems.map(toEngineItem);
  const profile = rawProfile ? serializeProfile(rawProfile) : null;
  const breakdown = scoreOutfit(items, profile);
  const { note, source } = await styleNote(items, profile, breakdown);

  return NextResponse.json({ styleNote: note, source, breakdown });
}
