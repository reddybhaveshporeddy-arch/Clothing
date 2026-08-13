"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { Spinner, ItemThumb, relativeDay } from "./ui";
import { fetchItemHistory, type ClientItem } from "@/lib/api";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Mini calendar of every day a single item was worn. */
export default function ItemHistory({
  item,
  open,
  onClose,
}: {
  item: ClientItem;
  open: boolean;
  onClose: () => void;
}) {
  const [days, setDays] = useState<string[] | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    setDays(null);
    fetchItemHistory(item.id)
      .then((d) => setDays(d.map((x) => x.date)))
      .catch(() => setDays([]));
  }, [open, item.id]);

  const wornSet = useMemo(() => new Set(days ?? []), [days]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    ).getDate();
    const out: (number | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    return out;
  }, [month]);

  function key(day: number) {
    const m = String(month.getMonth() + 1).padStart(2, "0");
    return `${month.getFullYear()}-${m}-${String(day).padStart(2, "0")}`;
  }

  return (
    <Modal open={open} onClose={onClose} title="Wear history">
      <div className="mb-5 flex items-center gap-3">
        <ItemThumb
          item={item}
          className="h-16 w-16 shrink-0 rounded-xl"
          sizes="64px"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="mt-0.5 text-xs text-[#a99bb5]">
            Worn {item.timesWorn} {item.timesWorn === 1 ? "time" : "times"} ·{" "}
            {relativeDay(item.lastWornDate)}
          </p>
        </div>
      </div>

      {days === null ? (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              className="btn-subtle px-2 py-1"
              onClick={() =>
                setMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
                )
              }
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {month.toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              type="button"
              aria-label="Next month"
              className="btn-subtle px-2 py-1"
              onClick={() =>
                setMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
                )
              }
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="py-1 text-[10px] text-[#83718e]">
                {d}
              </span>
            ))}
            {cells.map((day, i) =>
              day === null ? (
                <span key={`e${i}`} />
              ) : (
                <span
                  key={day}
                  className={`grid aspect-square place-items-center rounded-lg text-xs ${
                    wornSet.has(key(day))
                      ? "bg-accent font-semibold text-black"
                      : "bg-ink-800 text-[#9686a1]"
                  }`}
                >
                  {day}
                </span>
              )
            )}
          </div>

          {days.length === 0 && (
            <p className="mt-5 text-center text-sm text-[#a99bb5]">
              You haven&apos;t logged this item yet.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
