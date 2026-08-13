"use client";

import { useMemo, useState } from "react";
import { colorToHex } from "@/lib/colors";
import type { ClientItem } from "@/lib/api";

/**
 * Donut chart of the wardrobe's color distribution, drawn with stroke-dasharray
 * on concentric circle segments — no chart library needed.
 */
export default function ColorWheel({ items }: { items: ClientItem[] }) {
  const [open, setOpen] = useState(false);

  const slices = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) {
      const key = i.primaryColor.trim().toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const total = items.length || 1;
    let offset = 0;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([color, count]) => {
        const fraction = count / total;
        const slice = { color, count, fraction, offset };
        offset += fraction;
        return slice;
      });
  }, [items]);

  if (items.length < 3) return null;

  const C = 2 * Math.PI * 40; // circumference for r=40

  return (
    <div className="card mb-5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-ink-750/50"
      >
        <span className="text-sm font-medium">Color breakdown</span>
        <span className="flex items-center gap-2">
          <span className="flex -space-x-1.5">
            {slices.slice(0, 6).map((s) => (
              <span
                key={s.color}
                className="h-4 w-4 rounded-full ring-2 ring-ink-800"
                style={{ backgroundColor: colorToHex(s.color) }}
              />
            ))}
          </span>
          <span className="text-xs text-[#a99bb5]">{open ? "Hide" : "Show"}</span>
        </span>
      </button>

      {open && (
        <div className="animate-fade-up flex flex-col items-center gap-6 border-t border-ink-700 px-4 py-5 sm:flex-row sm:items-start">
          <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0 -rotate-90">
            {slices.map((s) => (
              <circle
                key={s.color}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={colorToHex(s.color)}
                strokeWidth="16"
                strokeDasharray={`${s.fraction * C} ${C}`}
                strokeDashoffset={-s.offset * C}
              >
                <title>{`${s.color}: ${s.count}`}</title>
              </circle>
            ))}
            <circle cx="50" cy="50" r="30" fill="#1e1725" />
          </svg>

          <ul className="grid w-full flex-1 grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {slices.map((s) => (
              <li
                key={s.color}
                className="flex items-center gap-2 text-xs text-[#cabfd2]"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/15"
                  style={{ backgroundColor: colorToHex(s.color) }}
                />
                <span className="flex-1 truncate capitalize">{s.color}</span>
                <span className="tabular-nums text-[#9686a1]">
                  {Math.round(s.fraction * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
