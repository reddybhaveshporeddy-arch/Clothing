import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  serializeOutfit,
  serializeProfile,
  stringifyArray,
  toEngineItem,
} from "@/lib/serialize";
import { scoreOutfit } from "@/lib/matching";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

type IncomingItem = { itemId: number; slot: string };

export async function POST(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const incoming: IncomingItem[] = Array.isArray(body.items)
    ? (body.items as { itemId?: unknown; slot?: unknown }[])
        .map((i) => ({ itemId: Number(i.itemId), slot: String(i.slot) }))
        .filter((i) => Number.isFinite(i.itemId))
    : [];

  if (incoming.length === 0) {
    return NextResponse.json(
      { error: "An outfit needs at least one item" },
      { status: 400 }
    );
  }

  // Scoped to the profile, so an outfit can never be built from someone
  // else's clothes — a stale id reads as "no longer exists".
  const rawItems = await prisma.clothingItem.findMany({
    where: {
      id: { in: incoming.map((i) => i.itemId) },
      profileId: ctx.profileId,
    },
  });
  if (rawItems.length !== new Set(incoming.map((i) => i.itemId)).size) {
    return NextResponse.json(
      { error: "One or more items no longer exist" },
      { status: 400 }
    );
  }

  const hasTop = incoming.some((i) => i.slot === "top");
  const hasBottom = incoming.some((i) => i.slot === "bottom");
  if (!hasTop || !hasBottom) {
    return NextResponse.json(
      { error: "An outfit needs at least a top and a bottom" },
      { status: 400 }
    );
  }

  // Always recompute the score server-side rather than trusting the client.
  const rawProfile = await prisma.styleProfile.findUnique({
    where: { profileId: ctx.profileId },
  });
  const profile = rawProfile ? serializeProfile(rawProfile) : null;
  const breakdown = scoreOutfit(rawItems.map(toEngineItem), profile);

  const outfit = await prisma.outfit.create({
    data: {
      profileId: ctx.profileId,
      name: String(body.name || "Untitled Outfit").slice(0, 80),
      score: breakdown.total,
      styleNote: body.styleNote ? String(body.styleNote) : null,
      tags: stringifyArray(body.tags),
      disliked: Boolean(body.disliked),
      items: {
        create: incoming.map((i) => ({ itemId: i.itemId, slot: i.slot })),
      },
    },
    include: { items: { include: { item: true } } },
  });

  return NextResponse.json(
    { outfit: serializeOutfit(outfit) },
    { status: 201 }
  );
}
