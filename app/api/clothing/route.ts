import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeItem, stringifyArray } from "@/lib/serialize";
import { parseTags, savePhoto, strOrNull } from "@/lib/upload";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const sp = req.nextUrl.searchParams;
  const category = sp.get("category");
  const color = sp.get("color");
  const tag = sp.get("tag");
  const season = sp.get("season");
  const search = sp.get("search");

  const items = await prisma.clothingItem.findMany({
    orderBy: { createdAt: "desc" },
    where: {
      profileId: ctx.profileId,
      ...(category ? { category } : {}),
      ...(season ? { season } : {}),
      ...(search ? { name: { contains: search } } : {}),
      ...(color ? { primaryColor: { contains: color } } : {}),
      // styleTags is a JSON string; matching the quoted tag is precise enough
      // because tags come from a fixed list.
      ...(tag ? { styleTags: { contains: `"${tag}"` } } : {}),
    },
  });

  return NextResponse.json({ items: items.map(serializeItem) });
}

export async function POST(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const form = await req.formData();

  const name = String(form.get("name") || "").trim();
  const category = String(form.get("category") || "").trim();
  const type = String(form.get("type") || "").trim();
  const primaryColor = String(form.get("primaryColor") || "").trim();

  if (!name || !category || !type || !primaryColor) {
    return NextResponse.json(
      { error: "name, category, type and primaryColor are required" },
      { status: 400 }
    );
  }

  const file = form.get("photo");
  let photoPath = String(form.get("photoPath") || "");

  if (file instanceof File && file.size > 0) {
    const saved = await savePhoto(file);
    if ("error" in saved) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    photoPath = saved.path;
  }

  if (!photoPath) {
    return NextResponse.json({ error: "A photo is required" }, { status: 400 });
  }

  const item = await prisma.clothingItem.create({
    data: {
      profileId: ctx.profileId,
      name,
      category,
      type,
      primaryColor,
      secondaryColor: strOrNull(form.get("secondaryColor")),
      styleTags: stringifyArray(parseTags(form.get("styleTags"))),
      season: String(form.get("season") || "all"),
      notes: strOrNull(form.get("notes")),
      photoPath,
    },
  });

  return NextResponse.json({ item: serializeItem(item) }, { status: 201 });
}
