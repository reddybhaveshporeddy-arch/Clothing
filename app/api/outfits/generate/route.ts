import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeItem, serializeProfile, toEngineItem } from "@/lib/serialize";
import { generateOutfits, outfitSignature } from "@/lib/matching";
import { styleNote } from "@/lib/claude";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const body = await req.json().catch(() => ({}));
  const count = Math.min(10, Math.max(1, Number(body.count) || 5));
  const excludeSignatures: string[] = Array.isArray(body.excludeSignatures)
    ? body.excludeSignatures.map(String)
    : [];
  const excludeItemIds: number[] = Array.isArray(body.excludeItemIds)
    ? body.excludeItemIds.map(Number).filter(Number.isFinite)
    : [];
  const withNotes = body.withNotes !== false;

  const [rawItems, rawProfile] = await Promise.all([
    prisma.clothingItem.findMany({ where: { profileId: ctx.profileId } }),
    prisma.styleProfile.findUnique({ where: { profileId: ctx.profileId } }),
  ]);

  const items = rawItems.map(toEngineItem);
  const profile = rawProfile ? serializeProfile(rawProfile) : null;

  const suggestions = generateOutfits(items, profile, {
    count,
    excludeSignatures,
    excludeItemIds,
  });

  if (suggestions.length === 0) {
    const tops = items.filter((i) => i.category === "top").length;
    const bottoms = items.filter((i) => i.category === "bottom").length;
    return NextResponse.json({
      outfits: [],
      reason:
        tops === 0 || bottoms === 0
          ? "You need at least one top and one bottom in your wardrobe."
          : "No new combinations left — try adding more items or clearing the ones you disliked.",
    });
  }

  // Style notes are fetched in parallel; each one falls back locally on error.
  const notes = withNotes
    ? await Promise.all(
        suggestions.map((s) =>
          styleNote(
            s.items.map((i) => i.item),
            profile,
            s.breakdown
          )
        )
      )
    : suggestions.map(() => ({ note: "", source: "local" as const }));

  const rawById = new Map(rawItems.map((i) => [i.id, i]));

  return NextResponse.json({
    outfits: suggestions.map((s, idx) => ({
      name: s.name,
      score: s.score,
      breakdown: s.breakdown,
      styleNote: notes[idx].note,
      noteSource: notes[idx].source,
      signature: outfitSignature(s.items),
      items: s.items.map((entry) => ({
        slot: entry.slot,
        item: serializeItem(rawById.get(entry.item.id)!),
      })),
    })),
  });
}
