"use client";

import { ItemThumb } from "./ui";
import type { ClientItem } from "@/lib/api";

const SLOT_ORDER = ["top", "bottom", "outerwear", "shoes", "accessory"];

/**
 * Photos of an outfit's pieces tiled together. Two items sit side by side,
 * three or more use a large lead tile with the rest stacked beside it.
 */
export default function OutfitTiles({
  items,
  className = "",
}: {
  items: { slot: string; item: ClientItem }[];
  className?: string;
}) {
  const sorted = [...items].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)
  );

  if (sorted.length === 0) {
    return <div className={`bg-ink-750 ${className}`} />;
  }

  if (sorted.length === 1) {
    return (
      <ItemThumb
        item={sorted[0].item}
        className={className}
        sizes="(max-width: 640px) 100vw, 340px"
      />
    );
  }

  if (sorted.length === 2) {
    return (
      <div className={`grid grid-cols-2 gap-0.5 bg-ink-700 ${className}`}>
        {sorted.map((s) => (
          <ItemThumb
            key={s.item.id}
            item={s.item}
            className="h-full w-full"
            sizes="(max-width: 640px) 50vw, 170px"
          />
        ))}
      </div>
    );
  }

  const [lead, ...rest] = sorted;
  return (
    <div className={`grid grid-cols-3 gap-0.5 bg-ink-700 ${className}`}>
      <div className="col-span-2 row-span-2">
        <ItemThumb
          item={lead.item}
          className="h-full w-full"
          sizes="(max-width: 640px) 66vw, 230px"
        />
      </div>
      <div className="grid grid-rows-2 gap-0.5">
        {rest.slice(0, 2).map((s) => (
          <ItemThumb
            key={s.item.id}
            item={s.item}
            className="h-full w-full"
            sizes="(max-width: 640px) 33vw, 115px"
          />
        ))}
      </div>
      {rest.length > 2 && (
        <div className="col-span-3 grid grid-cols-3 gap-0.5">
          {rest.slice(2, 5).map((s) => (
            <ItemThumb
              key={s.item.id}
              item={s.item}
              className="aspect-square w-full"
              sizes="(max-width: 640px) 33vw, 115px"
            />
          ))}
        </div>
      )}
    </div>
  );
}
