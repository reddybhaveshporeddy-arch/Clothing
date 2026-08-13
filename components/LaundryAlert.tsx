"use client";

import { useState } from "react";
import { ItemThumb } from "./ui";
import { CloseIcon, CheckIcon } from "./Icons";
import { markWashed, type ClientItem } from "@/lib/api";
import { useToast } from "./Toast";

const DISMISS_KEY = "fitcheck.laundryDismissedAt";
const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Nudge for pieces worn enough times since their last wash that they're
 * probably due. Marking an item washed resets its count from today.
 */
export default function LaundryAlert({
  items,
  onWashed,
}: {
  items: ClientItem[];
  onWashed: () => void;
}) {
  const toast = useToast();
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return true;
    const raw = localStorage.getItem(DISMISS_KEY);
    const dismissedAt = raw ? Number(raw) : 0;
    return Date.now() - dismissedAt < WEEK;
  });
  const [washing, setWashing] = useState<number | null>(null);

  if (hidden || items.length === 0) return null;

  async function wash(id: number) {
    setWashing(id);
    try {
      await markWashed(id);
      onWashed();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setWashing(null);
    }
  }

  return (
    <section className="card animate-fade-up border-rose/30 bg-rose/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-rose">
            {items.length} {items.length === 1 ? "piece is" : "pieces are"}{" "}
            due for a wash
          </h2>
          <p className="mt-1 text-xs text-[#b3a5bd]">
            Based on wears since you last marked them clean.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss for a week"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
            setHidden(true);
          }}
          className="rounded-lg p-1 text-[#a99bb5] transition hover:bg-ink-750 hover:text-white"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3.5 flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <div key={item.id} className="w-20 shrink-0">
            <ItemThumb
              item={item}
              className="aspect-square w-full rounded-xl"
              sizes="80px"
            />
            <p className="mt-1.5 truncate text-[10px] text-[#a99bb5]">
              {item.name}
            </p>
            <button
              type="button"
              onClick={() => wash(item.id)}
              disabled={washing === item.id}
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-ink-600 py-1 text-[10px] text-[#d6cddc] transition hover:border-rose/50 hover:text-rose disabled:opacity-50"
            >
              <CheckIcon className="h-3 w-3" />
              {washing === item.id ? "..." : "Washed"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
