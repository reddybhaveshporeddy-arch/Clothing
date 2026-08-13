import { NextRequest, NextResponse } from "next/server";
import { classifyClothingItem, hasApiKey } from "@/lib/claude";
import { TYPES_BY_CATEGORY } from "@/lib/constants";
import { withProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

const ALLOWED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Snap a model-guessed type to one of the dropdown's real options for that
 * category. The model is told the valid list, but "closest, not exact" is a
 * safer contract than trusting it to reproduce a string byte-for-byte.
 */
function snapType(category: string, guess: string): string | null {
  const options =
    TYPES_BY_CATEGORY[category as keyof typeof TYPES_BY_CATEGORY];
  if (!options) return null;

  const normalized = guess.trim().toLowerCase();
  const exact = options.find((o) => o.toLowerCase() === normalized);
  if (exact) return exact;

  const contains = options.find(
    (o) =>
      o.toLowerCase().includes(normalized) ||
      normalized.includes(o.toLowerCase())
  );
  return contains ?? null;
}

export async function POST(req: NextRequest) {
  const ctx = await withProfile();
  if ("response" in ctx) return ctx.response;

  if (!hasApiKey()) {
    return NextResponse.json({ available: false });
  }

  const form = await req.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "photo is required" }, { status: 400 });
  }
  if (!ALLOWED_MEDIA.has(photo.type)) {
    return NextResponse.json(
      { error: "Unsupported image type" },
      { status: 400 }
    );
  }
  // Vision requests get expensive fast on large images; this mirrors the
  // client-side compression limit rather than trusting it blindly.
  if (photo.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is too large" }, { status: 400 });
  }

  const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
  const result = await classifyClothingItem(
    base64,
    photo.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif"
  );

  if (!result) {
    return NextResponse.json({ available: true, suggestion: null });
  }

  const snappedType = snapType(result.category, result.type);

  return NextResponse.json({
    available: true,
    suggestion: {
      ...result,
      // Null means "the model's guess didn't match a real option" — the
      // client leaves that field for the person to pick themselves.
      type: snappedType,
    },
  });
}
