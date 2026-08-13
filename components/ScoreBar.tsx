"use client";

import { useState } from "react";
import type { ScoreBreakdown } from "@/lib/api";

const PARTS = [
  { key: "color", label: "Color", max: 40 },
  { key: "style", label: "Style", max: 30 },
  { key: "season", label: "Season", max: 15 },
  { key: "preference", label: "Your taste", max: 15 },
] as const;

/** Expandable explanation of where an outfit's score came from. */
export default function ScoreBar({ breakdown }: { breakdown: ScoreBreakdown }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-[11px] font-medium text-[#9686a1] underline-offset-2 transition hover:text-white hover:underline"
      >
        {open ? "Hide score breakdown" : "Why this score?"}
      </button>

      {open && (
        <div className="animate-fade-up mt-2.5 space-y-2 rounded-xl bg-ink-850 p-3">
          {PARTS.map((p) => {
            const value = breakdown[p.key];
            return (
              <div key={p.key} className="flex items-center gap-2.5">
                <span className="w-20 shrink-0 text-[11px] text-[#a99bb5]">
                  {p.label}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                  <span
                    className="block h-full rounded-full bg-accent transition-[width] duration-500"
                    style={{ width: `${(value / p.max) * 100}%` }}
                  />
                </span>
                <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-[#a99bb5]">
                  {value}/{p.max}
                </span>
              </div>
            );
          })}

          {breakdown.recencyPenalty > 0 && (
            <div className="flex items-center gap-2.5">
              <span className="w-20 shrink-0 text-[11px] text-amber-400/80">
                Recency
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                <span
                  className="block h-full rounded-full bg-amber-500/70"
                  style={{
                    width: `${(breakdown.recencyPenalty / 20) * 100}%`,
                  }}
                />
              </span>
              <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-amber-400/80">
                −{breakdown.recencyPenalty}
              </span>
            </div>
          )}

          {breakdown.notes.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-ink-700 pt-2.5">
              {breakdown.notes.map((n, i) => (
                <li key={i} className="text-[11px] text-[#a99bb5]">
                  · {n}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
