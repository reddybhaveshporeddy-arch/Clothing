import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyClothingItem, hasApiKey, scanVerdict } from "@/lib/claude";
import { serializeItem, serializeProfile, toEngineItem } from "@/lib/serialize";
import { matchAgainstWardrobe, PHANTOM_ITEM_ID } from "@/lib/matching";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * POST /api/scan
 * Photo of an item seen out in the world — classifies it, then scores how
 * well it would pair with the wardrobe this profile already owns. Nothing
 * is saved; this is a one-off "should I get this" check.
 */
export async function POST(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "Scanning needs an Anthropic API key configured on the server." },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "A photo is required" }, { status: 400 });
  }
  if (!ALLOWED_MEDIA.has(photo.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (photo.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is too large" }, { status: 400 });
  }

  const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
  const classification = await classifyClothingItem(
    base64,
    photo.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif"
  );

  if (!classification) {
    return NextResponse.json(
      {
        error:
          "Couldn't make out what this is — try a clearer, more front-on shot.",
      },
      { status: 422 }
    );
  }

  const [rawItems, rawProfile] = await Promise.all([
    prisma.clothingItem.findMany({ where: { profileId: ctx.profileId } }),
    prisma.styleProfile.findUnique({ where: { profileId: ctx.profileId } }),
  ]);

  const wardrobe = rawItems.map(toEngineItem);
  const profile = rawProfile ? serializeProfile(rawProfile) : null;

  const phantom = {
    id: PHANTOM_ITEM_ID,
    name: classification.name,
    category: classification.category,
    type: classification.type,
    primaryColor: classification.primaryColor,
    secondaryColor: classification.secondaryColor,
    styleTags: classification.styleTags,
    season: classification.season,
    timesWorn: 0,
    lastWornDate: null,
    photoPath: "",
  };

  const matches = matchAgainstWardrobe(phantom, wardrobe, profile);
  const verdict = await scanVerdict(
    phantom,
    matches.map((m) => ({ items: m.items.map((e) => e.item), score: m.score })),
    profile
  );

  const rawById = new Map(rawItems.map((i) => [i.id, i]));

  return NextResponse.json({
    item: classification,
    bestScore: matches[0]?.score ?? null,
    matches: matches.map((m) => ({
      score: m.score,
      items: m.items
        .filter((e) => e.item.id !== PHANTOM_ITEM_ID)
        .map((e) => ({ slot: e.slot, item: serializeItem(rawById.get(e.item.id)!) })),
    })),
    verdict: verdict.text,
    verdictSource: verdict.source,
  });
}
