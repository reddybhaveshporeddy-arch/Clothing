import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeItem, stringifyArray } from "@/lib/serialize";
import { deletePhoto, parseTags, savePhoto, strOrNull } from "@/lib/upload";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const id = Number(params.id);
  // findFirst with profileId, not findUnique by id — an item belonging to
  // another profile must read as missing, not as someone else's data.
  const item = await prisma.clothingItem.findFirst({
    where: { id, profileId: ctx.profileId },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: serializeItem(item) });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const id = Number(params.id);
  const existing = await prisma.clothingItem.findFirst({
    where: { id, profileId: ctx.profileId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";
  const data: Record<string, unknown> = {};

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const set = (key: string, value: unknown) => {
      if (form.has(key)) data[key] = value;
    };

    set("name", String(form.get("name") || "").trim());
    set("category", String(form.get("category") || "").trim());
    set("type", String(form.get("type") || "").trim());
    set("primaryColor", String(form.get("primaryColor") || "").trim());
    set("secondaryColor", strOrNull(form.get("secondaryColor")));
    set("season", String(form.get("season") || "all"));
    set("notes", strOrNull(form.get("notes")));
    if (form.has("styleTags")) {
      data.styleTags = stringifyArray(parseTags(form.get("styleTags")));
    }

    const file = form.get("photo");
    if (file instanceof File && file.size > 0) {
      const saved = await savePhoto(file);
      if ("error" in saved) {
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }
      data.photoPath = saved.path;
      await deletePhoto(existing.photoPath);
    }
  } else {
    const body = await req.json();
    for (const key of [
      "name",
      "category",
      "type",
      "primaryColor",
      "secondaryColor",
      "season",
      "notes",
      "photoPath",
    ]) {
      if (key in body) data[key] = body[key];
    }
    if ("styleTags" in body) data.styleTags = stringifyArray(body.styleTags);
  }

  // Reject blank values for fields the UI requires.
  for (const key of ["name", "category", "type", "primaryColor"]) {
    if (key in data && !String(data[key] ?? "").trim()) {
      return NextResponse.json(
        { error: `${key} cannot be empty` },
        { status: 400 }
      );
    }
  }

  const item = await prisma.clothingItem.update({ where: { id }, data });
  return NextResponse.json({ item: serializeItem(item) });
}

/** PATCH /api/clothing/[id] — marks the item as just washed, resetting the
 * wears-since-wash count used by the laundry nudge. */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const id = Number(params.id);
  const existing = await prisma.clothingItem.findFirst({
    where: { id, profileId: ctx.profileId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.clothingItem.update({
    where: { id },
    data: { lastWashedDate: new Date() },
  });
  return NextResponse.json({ item: serializeItem(item) });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const id = Number(params.id);
  const existing = await prisma.clothingItem.findFirst({
    where: { id, profileId: ctx.profileId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Outfits that relied on this item are no longer wearable as saved.
  const affected = await prisma.outfitItem.findMany({
    where: { itemId: id },
    select: { outfitId: true },
  });
  const outfitIds = [...new Set(affected.map((a) => a.outfitId))];

  await prisma.$transaction([
    prisma.wearLog.deleteMany({ where: { itemId: id } }),
    prisma.outfitItem.deleteMany({ where: { itemId: id } }),
    prisma.clothingItem.delete({ where: { id } }),
  ]);

  // Drop outfits left with fewer than two pieces.
  for (const outfitId of outfitIds) {
    const remaining = await prisma.outfitItem.count({ where: { outfitId } });
    if (remaining < 2) {
      await prisma.wearLog.updateMany({
        where: { outfitId },
        data: { outfitId: null },
      });
      await prisma.outfitItem.deleteMany({ where: { outfitId } });
      await prisma.outfit.delete({ where: { id: outfitId } }).catch(() => {});
    }
  }

  await deletePhoto(existing.photoPath);

  return NextResponse.json({ ok: true });
}
