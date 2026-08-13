import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeOutfit, stringifyArray } from "@/lib/serialize";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));

  const owned = await prisma.outfit.findFirst({
    where: { id, profileId: ctx.profileId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.slice(0, 80);
  if ("tags" in body) data.tags = stringifyArray(body.tags);
  if ("styleNote" in body) data.styleNote = body.styleNote ?? null;
  if ("disliked" in body) data.disliked = Boolean(body.disliked);

  const outfit = await prisma.outfit.update({
    where: { id },
    data,
    include: { items: { include: { item: true } } },
  });

  return NextResponse.json({ outfit: serializeOutfit(outfit) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const id = Number(params.id);
  const existing = await prisma.outfit.findFirst({
    where: { id, profileId: ctx.profileId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Keep the wear history — just detach it from the deleted outfit.
  await prisma.$transaction([
    prisma.wearLog.updateMany({ where: { outfitId: id }, data: { outfitId: null } }),
    prisma.outfitItem.deleteMany({ where: { outfitId: id } }),
    prisma.outfit.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
