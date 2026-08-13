import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeProfileId, type ClientProfileSummary } from "@/lib/profile";
import { deletePhoto, savePhoto } from "@/lib/upload";

export const dynamic = "force-dynamic";

const MAX_PROFILES = 12;

function serialize(p: {
  id: number;
  name: string;
  color: string;
  emoji: string | null;
  photoPath: string | null;
  _count: { items: number };
  style: { id: number } | null;
}): ClientProfileSummary {
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

export async function GET() {
  const [profiles, active] = await Promise.all([
    prisma.profile.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { items: true } },
        style: { select: { id: true } },
      },
    }),
    activeProfileId(),
  ]);

  return NextResponse.json({
    profiles: profiles.map(serialize),
    activeProfileId: active,
  });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");

  const body = isMultipart
    ? Object.fromEntries((await req.formData()).entries())
    : await req.json().catch(() => ({}));

  const name = String(body.name || "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 24) {
    return NextResponse.json(
      { error: "Keep the name under 24 characters" },
      { status: 400 }
    );
  }

  const count = await prisma.profile.count();
  if (count >= MAX_PROFILES) {
    return NextResponse.json(
      { error: `That's the limit of ${MAX_PROFILES} profiles` },
      { status: 400 }
    );
  }

  // Names are the only way to tell profiles apart, so they have to be unique.
  const clash = await prisma.profile.findFirst({
    where: { name: { equals: name } },
  });
  if (clash) {
    return NextResponse.json(
      { error: `There's already a profile called ${clash.name}` },
      { status: 409 }
    );
  }

  let photoPath: string | null = null;
  const photo = body.photo;
  if (isMultipart && photo instanceof File && photo.size > 0) {
    const saved = await savePhoto(photo);
    if ("error" in saved) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    photoPath = saved.path;
  }

  try {
    const profile = await prisma.profile.create({
      data: {
        name,
        color: String(body.color || "#c9a25a"),
        emoji: body.emoji ? String(body.emoji).slice(0, 8) : null,
        photoPath,
      },
      include: {
        _count: { select: { items: true } },
        style: { select: { id: true } },
      },
    });

    return NextResponse.json({ profile: serialize(profile) }, { status: 201 });
  } catch (err) {
    // Two devices creating the same name at once race past the findFirst
    // check above — the DB's unique constraint is the real backstop.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: `There's already a profile called ${name}` },
        { status: 409 }
      );
    }
    if (photoPath) await deletePhoto(photoPath);
    throw err;
  }
}
