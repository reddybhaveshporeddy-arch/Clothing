"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import OutfitTiles from "@/components/OutfitTiles";
import { SectionHeading, Spinner } from "@/components/ui";
import { ImageIcon, ScanIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { scanItem, type ScanResult } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { convertHeicIfNeeded } from "@/lib/heic";

const SCAN_MESSAGES = [
  "Reading the item...",
  "Checking it against your closet...",
  "Weighing the pairings...",
];

export default function ScanPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState(SCAN_MESSAGES[0]);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function handleFile(raw: File | undefined | null) {
    if (!raw) return;
    const converted = await convertHeicIfNeeded(raw);
    if (!converted.type.startsWith("image/")) {
      toast("That file isn't an image", "error");
      return;
    }

    const url = URL.createObjectURL(converted);
    setPreview(url);
    setResult(null);
    setScanning(true);

    const cycle = window.setInterval(() => {
      setMessage(SCAN_MESSAGES[Math.floor(Math.random() * SCAN_MESSAGES.length)]);
    }, 1300);

    try {
      const compressed = await compressImage(converted);
      const res = await scanItem(compressed);
      setResult(res);
    } catch (err) {
      toast((err as Error).message, "error");
      setPreview(null);
    } finally {
      window.clearInterval(cycle);
      setScanning(false);
    }
  }

  function reset() {
    setPreview(null);
    setResult(null);
  }

  const tone =
    result?.bestScore == null
      ? "border-ink-600 bg-ink-750 text-[#cabfd2]"
      : result.bestScore >= 80
      ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
      : result.bestScore >= 60
      ? "border-accent/40 bg-accent/10 text-accent-soft"
      : "border-rose/40 bg-rose/10 text-rose-soft";

  return (
    <div>
      <SectionHeading
        title="Scan a find"
        subtitle="Snap something you like out in the world — we'll check it against your closet before you buy it."
      />

      {!preview && (
        <div
          onClick={() => fileRef.current?.click()}
          className="flex h-56 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-ink-600 bg-ink-800 text-center transition hover:border-accent/50"
        >
          <ScanIcon className="h-8 w-8 text-[#83718e]" />
          <p className="px-6 text-sm text-[#9686a1]">
            Tap to take a photo of the item
          </p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {preview && (
        <div className="space-y-5">
          <div className="relative h-64 overflow-hidden rounded-2xl bg-ink-800">
            <Image
              src={preview}
              alt="Scanned item"
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-contain"
              unoptimized
            />
            {scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                <Spinner className="h-7 w-7" />
                <p className="text-sm font-medium text-white">{message}</p>
              </div>
            )}
          </div>

          {result && (
            <div className="animate-fade-up space-y-5">
              <div className="card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a99bb5]">
                  What we saw
                </p>
                <h2 className="mt-1 font-serif text-lg font-medium">
                  {result.item.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="badge">{result.item.category}</span>
                  {result.item.type && <span className="badge">{result.item.type}</span>}
                  <span className="badge">{result.item.primaryColor}</span>
                  {result.item.styleTags.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${tone}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed">{result.verdict}</p>
                  {result.bestScore != null && (
                    <span className="shrink-0 text-lg font-semibold tabular-nums">
                      {Math.round(result.bestScore)}%
                    </span>
                  )}
                </div>
              </div>

              {result.matches.length > 0 ? (
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#a99bb5]">
                    Best pairings from your closet
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {result.matches.map((m, i) => (
                      <div key={i} className="card overflow-hidden">
                        <OutfitTiles items={m.items} className="aspect-square w-full" />
                        <div className="flex items-center justify-between p-2.5">
                          <p className="truncate text-xs text-[#a99bb5]">
                            {m.items.map((e) => e.item.name).join(" · ")}
                          </p>
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-[#cabfd2]">
                            {Math.round(m.score)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card flex items-center gap-3 p-4 text-sm text-[#a99bb5]">
                  <ImageIcon className="h-5 w-5 shrink-0" />
                  You need at least one top and one bottom in your wardrobe for
                  pairing to work.
                </div>
              )}

              <button type="button" onClick={reset} className="btn-ghost w-full">
                Scan another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
