import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProfile, stringifyArray } from "@/lib/serialize";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const profile = await prisma.styleProfile.findUnique({
    where: { profileId: ctx.profileId },
  });
  return NextResponse.json({
    profile: profile ? serializeProfile(profile) : null,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  const body = await req.json();

  const data = {
    styleVibe: String(body.styleVibe || "mixed"),
    preferredColors: stringifyArray(body.preferredColors),
    fit: String(body.fit || "mixed"),
    occasion: String(body.occasion || "both"),
    avoidColors: stringifyArray(body.avoidColors),
    mustInclude: stringifyArray(body.mustInclude),
  };

  // One style profile per person, keyed on the profile rather than a fixed id.
  const profile = await prisma.styleProfile.upsert({
    where: { profileId: ctx.profileId },
    update: data,
    create: { profileId: ctx.profileId, ...data },
  });

  return NextResponse.json({ profile: serializeProfile(profile) });
}

export async function DELETE() {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  await prisma.styleProfile.deleteMany({ where: { profileId: ctx.profileId } });
  return NextResponse.json({ ok: true });
}
