import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { del, put } from "@vercel/blob";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

/**
 * Deployed environments (Vercel) have a read-only filesystem, so uploads go
 * to Blob storage there instead. Local dev has no Blob token configured and
 * keeps writing straight to /public/uploads — simpler to work with and
 * nothing to provision just to run the app on a laptop.
 */
function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Persist an uploaded image and return its public path/URL. */
export async function savePhoto(
  file: File
): Promise<{ path: string } | { error: string }> {
  if (file.size > MAX_BYTES) {
    return { error: "Image is larger than 8MB" };
  }
  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return { error: "Only JPEG, PNG, WebP or GIF images are supported" };
  }

  const filename = `${randomUUID()}${ext}`;

  if (blobConfigured()) {
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return { path: blob.url };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, filename),
    Buffer.from(await file.arrayBuffer())
  );
  return { path: `/uploads/${filename}` };
}

/**
 * Remove an uploaded file. Never throws — a missing file shouldn't fail the
 * delete of its item.
 */
export async function deletePhoto(photoPath: string | null | undefined) {
  if (!photoPath) return;

  if (photoPath.startsWith("/uploads/")) {
    const filename = path.basename(photoPath);
    const target = path.join(UPLOAD_DIR, filename);
    if (!target.startsWith(UPLOAD_DIR)) return;
    try {
      await unlink(target);
    } catch {
      /* already gone */
    }
    return;
  }

  if (blobConfigured() && photoPath.includes("blob.vercel-storage.com")) {
    try {
      await del(photoPath);
    } catch {
      /* already gone */
    }
  }
}

export function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s.length ? s : null;
}

export function parseTags(v: FormDataEntryValue | null): string[] {
  if (v == null) return [];
  try {
    const parsed = JSON.parse(String(v));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
