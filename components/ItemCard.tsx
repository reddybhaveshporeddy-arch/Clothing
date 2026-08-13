"use client";

import { useState } from "react";
import { ColorDot, ItemThumb, relativeDay } from "./ui";
import ItemHistory from "./ItemHistory";
import type { ClientItem } from "@/lib/api";
import { CATEGORY_LABELS, type Category } from "@/lib/constants";

export default function ItemCard({
  item,
  onEdit,
}: {
  item: ClientItem;
  onEdit: (item: ClientItem) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <div className="card group animate-fade-up overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:border-ink-600">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="block w-full text-left"
          aria-label={`Edit ${item.name}`}
        >
          <ItemThumb
            item={item}
            className="aspect-square w-full"
            sizes="(max-width: 640px) 45vw, 220px"
          />
        </button>

        <div className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="line-clamp-2 flex-1 text-left text-[13px] font-semibold leading-snug hover:text-accent-soft"
            >
              {item.name}
            </button>
            <ColorDot color={item.primaryColor} title={item.primaryColor} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge">
              {CATEGORY_LABELS[item.category as Category] ?? item.category}
            </span>
            {item.styleTags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded-md bg-ink-750 px-1.5 py-0.5 text-[10px] text-[#b3a5bd]"
              >
                {t}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="w-full rounded-lg bg-ink-850 px-2 py-1.5 text-left text-[11px] text-[#a99bb5] transition hover:bg-ink-750 hover:text-white"
          >
            {item.timesWorn > 0 ? (
              <>
                Worn {item.timesWorn}{" "}
                {item.timesWorn === 1 ? "time" : "times"} ·{" "}
                {relativeDay(item.lastWornDate)}
              </>
            ) : (
              "Not worn yet"
            )}
          </button>
        </div>
      </div>

      <ItemHistory
        item={item}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
