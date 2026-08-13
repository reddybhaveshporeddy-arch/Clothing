import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeOutfit } from "@/lib/serialize";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

const SORTS = {
  worn: [{ timesWorn: "desc" as const }, { createdAt: "desc" as const }],
  recent: [{ createdAt: "desc" as const }],
  score: [{ score: "desc" as const }],
};

export async function GET(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const sort = req.nextUrl.searchParams.get("sort") || "recent";
  const tag = req.nextUrl.searchParams.get("tag");

  const outfits = await prisma.outfit.findMany({
    where: {
      profileId: ctx.profileId,
      disliked: false,
      ...(tag ? { tags: { contains: `"${tag}"` } } : {}),
    },
    orderBy: SORTS[sort as keyof typeof SORTS] ?? SORTS.recent,
    include: { items: { include: { item: true } } },
  });

  return NextResponse.json({ outfits: outfits.map(serializeOutfit) });
}
