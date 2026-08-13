"use client";

const HEIC_EXT = /\.hei[cf]$/i;

/**
 * True when a file is (or looks like) HEIC/HEIF — the default photo format
 * on iPhones. Many browsers hand back an empty or non-standard `.type` for
 * it rather than "image/heic", so the extension is checked too.
 */
export function looksLikeHeic(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    HEIC_EXT.test(file.name)
  );
}

/**
 * Convert a HEIC/HEIF file to JPEG so the browser can actually decode and
 * display it — outside Safari, canvas/`<img>` can't render HEIC at all, so
 * without this every iPhone photo picked "as is" fails silently or trips
 * the "that file isn't an image" check.
 *
 * Returns the original file untouched if it isn't HEIC, or if conversion
 * fails for any reason — the caller's existing image-type check still runs
 * as a backstop.
 */
export async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!looksLikeHeic(file)) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    const blob = Array.isArray(result) ? result[0] : result;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
