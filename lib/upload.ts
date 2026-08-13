import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

/** Persist an uploaded image and return its public path. */
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
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}${ext}`;
  await writeFile(
    path.join(UPLOAD_DIR, filename),
    Buffer.from(await file.arrayBuffer())
  );
  return { path: `/uploads/${filename}` };
}

/**
 * Remove an uploaded file. Only touches paths under /public/uploads, and never
 * throws — a missing file shouldn't fail the delete of its item.
 */
export async function deletePhoto(photoPath: string | null | undefined) {
  if (!photoPath || !photoPath.startsWith("/uploads/")) return;
  const filename = path.basename(photoPath);
  const target = path.join(UPLOAD_DIR, filename);
  if (!target.startsWith(UPLOAD_DIR)) return;
  try {
    await unlink(target);
  } catch {
    /* already gone */
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
