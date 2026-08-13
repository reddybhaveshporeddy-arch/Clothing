"use client";

import { useEffect, useState } from "react";
import { ItemThumb } from "./ui";
import { CloseIcon } from "./Icons";
import type { ClientItem } from "@/lib/api";

const DISMISS_KEY = "fitcheck.underusedDismissedAt";
const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Weekly nudge about clothes that haven't been worn in 3+ weeks.
 * Dismissing it hides the prompt for a week.
 */
export default function UnderusedAlert({ items }: { items: ClientItem[] }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY);
    const dismissedAt = raw ? Number(raw) : 0;
    setHidden(Date.now() - dismissedAt < WEEK);
  }, []);

  if (hidden || items.length === 0) return null;

  return (
    <section className="card animate-fade-up border-accent/30 bg-accent/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-accent-soft">
            {items.length} {items.length === 1 ? "piece is" : "pieces are"}{" "}
            collecting dust
          </h2>
          <p className="mt-1 text-xs text-[#b3a5bd]">
            Nothing worn in three weeks or more. Worth working back in?
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
          </div>
        ))}
      </div>
    </section>
  );
}
