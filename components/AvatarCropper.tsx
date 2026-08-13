"use client";

import { useEffect, useRef, useState } from "react";

const PREVIEW_SIZE = 260; // px, the on-screen crop viewport
const OUTPUT_SIZE = 480; // px, the exported square image

/**
 * Drag-to-pan, slider-to-zoom square cropper.
 *
 * There's no way to know which part of an arbitrary photo is "the face and
 * chest" without asking — so instead of guessing a crop box, this hands the
 * framing to the person who can actually see the picture.
 */
export default function AvatarCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(
    null
  );
  const [zoom, setZoom] = useState(1); // 1..3, multiplies the cover-fit scale
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // px, preview space
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: { x: number; y: number };
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale =
    natural && natural.w > 0 && natural.h > 0
      ? Math.max(PREVIEW_SIZE / natural.w, PREVIEW_SIZE / natural.h)
      : 1;
  const totalScale = baseScale * zoom;
  const displayW = natural ? natural.w * totalScale : PREVIEW_SIZE;
  const displayH = natural ? natural.h * totalScale : PREVIEW_SIZE;
  const maxOffsetX = Math.max(0, (displayW - PREVIEW_SIZE) / 2);
  const maxOffsetY = Math.max(0, (displayH - PREVIEW_SIZE) / 2);

  function clamp(o: { x: number; y: number }) {
    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, o.x)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, o.y)),
    };
  }

  // Re-clamp whenever zoom changes, so a zoom-out never leaves a gap at the edge.
  useEffect(() => {
    setOffset((o) => clamp(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, natural]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(
      clamp({ x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy })
    );
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  async function confirm() {
    if (!imgUrl || !natural) return;
    const img = new window.Image();
    img.src = imgUrl;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Same centering math as the CSS preview, scaled up to export resolution.
    const ratio = OUTPUT_SIZE / PREVIEW_SIZE;
    const drawW = displayW * ratio;
    const drawH = displayH * ratio;
    const drawX = (OUTPUT_SIZE - drawW) / 2 + offset.x * ratio;
    const drawY = (OUTPUT_SIZE - drawH) / 2 + offset.y * ratio;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative touch-none select-none overflow-hidden rounded-2xl border border-ink-600 bg-ink-850"
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, cursor: "grab" }}
      >
        {imgUrl && (
          // A plain <img>, not next/image — the element needs manual pixel
          // control (width/left/top) for the drag-to-pan math to line up
          // exactly with what gets drawn to the export canvas.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt="Crop preview"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            className="pointer-events-none absolute"
            style={{
              width: displayW,
              height: displayH,
              left: (PREVIEW_SIZE - displayW) / 2 + offset.x,
              top: (PREVIEW_SIZE - displayH) / 2 + offset.y,
            }}
          />
        )}
        {/* A soft frame, not a mask — the point is showing what's cropped,
            not hiding it. */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
      </div>

      <div className="flex w-full max-w-[260px] items-center gap-3">
        <span className="text-[11px] text-[#83718e]">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.02}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-700 accent-accent"
        />
      </div>
      <p className="text-center text-[11px] text-[#83718e]">
        Drag to reposition, use the slider to zoom.
      </p>

      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={confirm}
          disabled={!natural}
        >
          Use this photo
        </button>
      </div>
    </div>
  );
}
