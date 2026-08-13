import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PROFILE_COOKIE } from "@/lib/profile";
import { deletePhoto, savePhoto } from "@/lib/upload";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function serialize(p: {
  id: number;
  name: string;
  color: string;
  emoji: string | null;
  photoPath: string | null;
  _count: { items: number };
  style: { id: number } | null;
}) {
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    emoji: p.emoji,
    photoPath: p.photoPath,
    itemCount: p._count.items,
    hasCompletedQuiz: Boolean(p.style),
  };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const id = Number(params.id);
  const contentType = req.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");

  const existing = await prisma.profile.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  let oldPhotoToDelete: string | null = null;

  if (isMultipart) {
    const form = await req.formData();

    if (form.has("name")) {
      const name = String(form.get("name") || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
      }
      data.name = name.slice(0, 24);
    }
    if (form.has("color")) data.color = String(form.get("color"));
    if (form.has("emoji")) {
      const emoji = String(form.get("emoji") || "");
      data.emoji = emoji ? emoji.slice(0, 8) : null;
    }

    const photo = form.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const saved = await savePhoto(photo);
      if ("error" in saved) {
        return NextResponse.json({ error: saved.error }, { status: 400 });
      }
      data.photoPath = saved.path;
      oldPhotoToDelete = existing.photoPath;
    } else if (form.get("removePhoto") === "1") {
      data.photoPath = null;
      oldPhotoToDelete = existing.photoPath;
    }
  } else {
    const body = await req.json().catch(() => ({}));

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
      }
      data.name = name.slice(0, 24);
    }
    if (typeof body.color === "string") data.color = body.color;
    if ("emoji" in body) {
      data.emoji = body.emoji ? String(body.emoji).slice(0, 8) : null;
    }
  }

  if (typeof data.name === "string") {
    const clash = await prisma.profile.findFirst({
      where: { name: data.name as string, id: { not: id } },
    });
    if (clash) {
      return NextResponse.json(
        { error: `There's already a profile called ${clash.name}` },
        { status: 409 }
      );
    }
  }

  const profile = await prisma.profile.update({
    where: { id },
    data,
    include: {
      _count: { select: { items: true } },
      style: { select: { id: true } },
    },
  });

  if (oldPhotoToDelete) await deletePhoto(oldPhotoToDelete);

  return NextResponse.json({ profile: serialize(profile) });
}

/**
 * Deleting a profile takes its whole wardrobe with it — the schema cascades,
 * so we only have to clean up the photo files the database doesn't know how
 * to remove.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const id = Number(params.id);

  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { items: { select: { photoPath: true } } },
  });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const photos = profile.items.map((i) => i.photoPath);
  if (profile.photoPath) photos.push(profile.photoPath);
  await prisma.profile.delete({ where: { id } });
  await Promise.all(photos.map((p) => deletePhoto(p)));

  const res = NextResponse.json({ ok: true });
  // Only clear the cookie if this device was actually on the deleted profile —
  // deleting someone else's shouldn't kick you back to the picker.
  if (Number(req.cookies.get(PROFILE_COOKIE)?.value) === id) {
    res.cookies.delete(PROFILE_COOKIE);
  }
  return res;
}
