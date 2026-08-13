import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export const PROFILE_COOKIE = "fitcheck.profile";

/**
 * Which profile this device is using.
 *
 * The cookie is deliberately readable and unsigned — profiles separate
 * wardrobes, they don't secure them. Anyone who can reach the app can pick any
 * profile, and that's the stated design. If this ever becomes real
 * multi-user, this is the function that grows a session check.
 *
 * Returns null when the cookie is missing or points at a deleted profile.
 */
export async function activeProfileId(): Promise<number | null> {
  const raw = cookies().get(PROFILE_COOKIE)?.value;
  const id = Number(raw);
  if (!raw || !Number.isFinite(id)) return null;

  const profile = await prisma.profile.findUnique({
    where: { id },
    select: { id: true },
  });
  return profile?.id ?? null;
}

/** 409 body used by every route that needs a profile and hasn't got one. */
export function noProfileResponse() {
  return NextResponse.json(
    { error: "No profile selected", code: "NO_PROFILE" },
    { status: 409 }
  );
}

/**
 * Resolve the active profile or hand back the response to return.
 *
 *   const ctx = await withProfile();
 *   if ("response" in ctx) return ctx.response;
 *   // ctx.profileId is a number from here on
 */
export async function withProfile(): Promise<
  { profileId: number } | { response: NextResponse }
> {
  const profileId = await activeProfileId();
  if (profileId === null) return { response: noProfileResponse() };
  return { profileId };
}

export type ClientProfileSummary = {
  id: number;
  name: string;
  color: string;
  emoji: string | null;
  photoPath: string | null;
  itemCount: number;
  hasCompletedQuiz: boolean;
};
