import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PROFILE_COOKIE } from "@/lib/profile";

export const dynamic = "force-dynamic";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Switch this device to a profile. The choice is per-device, so your phone and
 * your laptop can be on different profiles at the same time.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.profileId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { style: { select: { id: true } } },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const res = NextResponse.json({
    profile: {
      id: profile.id,
      name: profile.name,
      color: profile.color,
      emoji: profile.emoji,
      photoPath: profile.photoPath,
      hasCompletedQuiz: Boolean(profile.style),
    },
  });

  res.cookies.set(PROFILE_COOKIE, String(profile.id), {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    // Deliberately readable by client JS: this marks who you are, it doesn't
    // protect anything. See lib/profile.ts.
    httpOnly: false,
  });

  return res;
}

/** Sign out of the current profile and go back to the picker. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PROFILE_COOKIE);
  return res;
}
