"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import OutfitTiles from "@/components/OutfitTiles";
import LogOutfitPicker from "@/components/LogOutfitPicker";
import {
  ItemThumb,
  SectionHeading,
  Spinner,
  relativeDay,
  wearCount,
} from "@/components/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlameIcon,
  PlusIcon,
} from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  clearWear,
  fetchStats,
  fetchWearLog,
  type Stats,
  type WearDay,
} from "@/lib/api";
import { dateKey } from "@/lib/serialize";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const toast = useToast();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [days, setDays] = useState<WearDay[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState<string | null>(null);

  const todayKey = dateKey(new Date());

  const load = useCallback(async () => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    try {
      const [log, s] = await Promise.all([
        fetchWearLog(dateKey(start), dateKey(end)),
        fetchStats(),
      ]);
      setDays(log);
      setStats(s);
    } catch (err) {
      toast((err as Error).message, "error");
      setDays([]);
    }
  }, [month, toast]);

  useEffect(() => {
    setDays(null);
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, WearDay>();
    for (const d of days ?? []) map.set(d.date, d);
    return map;
  }, [days]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const total = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    ).getDate();
    const out: (string | null)[] = Array(first.getDay()).fill(null);
    for (let d = 1; d <= total; d++) {
      const m = String(month.getMonth() + 1).padStart(2, "0");
      out.push(`${month.getFullYear()}-${m}-${String(d).padStart(2, "0")}`);
    }
    return out;
  }, [month]);

  const selectedDay = selected ? byDate.get(selected) : undefined;
  const isFuture = (key: string) => key > todayKey;

  async function clearDay(key: string) {
    try {
      await clearWear(key);
      toast("Cleared");
      setSelected(null);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  return (
    <div>
      <SectionHeading
        title="Calendar"
        subtitle="What you wore, and when."
        right={
          <button
            className="btn-primary"
            onClick={() => setPickerDate(todayKey)}
          >
            <PlusIcon className="h-4 w-4" />
            Log today&apos;s outfit
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* ----------------------------------------------------- calendar */}
        <div className="card p-4">
          <div className="mb-4 flex items-center justify-between">
            <button
              className="btn-subtle px-2.5 py-1.5"
              aria-label="Previous month"
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              }
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold">
              {month.toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              className="btn-subtle px-2.5 py-1.5"
              aria-label="Next month"
              onClick={() =>
                setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              }
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-[#83718e]"
              >
                {d.slice(0, 1)}
                <span className="hidden sm:inline">{d.slice(1)}</span>
              </span>
            ))}

            {cells.map((key, i) =>
              key === null ? (
                <span key={`empty-${i}`} />
              ) : (
                <DayCell
                  key={key}
                  dateKeyValue={key}
                  day={byDate.get(key)}
                  isToday={key === todayKey}
                  isFuture={isFuture(key)}
                  loading={days === null}
                  onClick={() => {
                    if (byDate.has(key)) setSelected(key);
                    else setPickerDate(key);
                  }}
                />
              )
            )}
          </div>

          <p className="mt-4 text-center text-xs text-[#9686a1]">
            Tap a day to see or log an outfit.
          </p>
        </div>

        {/* -------------------------------------------------------- stats */}
        <StatsPanel stats={stats} />
      </div>

      {/* --------------------------------------------------- day details */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={
          selected
            ? new Date(selected + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : ""
        }
        footer={
          selected && (
            <div className="flex gap-2">
              <button
                className="btn-subtle"
                onClick={() => clearDay(selected)}
              >
                Clear this day
              </button>
              <div className="flex-1" />
              <button
                className="btn-ghost"
                onClick={() => {
                  setPickerDate(selected);
                  setSelected(null);
                }}
              >
                Change outfit
              </button>
            </div>
          )
        }
      >
        {selectedDay ? (
          <div className="space-y-4">
            {selectedDay.outfitName && (
              <p className="text-sm font-semibold">{selectedDay.outfitName}</p>
            )}
            <OutfitTiles
              items={selectedDay.items.map((i) => ({
                slot: i.category,
                item: i,
              }))}
              className="aspect-[4/3] w-full overflow-hidden rounded-2xl"
            />
            <ul className="space-y-2">
              {selectedDay.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <ItemThumb
                    item={item}
                    className="h-11 w-11 shrink-0 rounded-lg"
                    sizes="44px"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs capitalize text-[#a99bb5]">
                      {item.category} · {item.primaryColor}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-[#a99bb5]">Nothing logged for this day.</p>
        )}
      </Modal>

      <LogOutfitPicker
        date={pickerDate}
        onClose={() => setPickerDate(null)}
        onLogged={() => {
          setPickerDate(null);
          load();
        }}
      />
    </div>
  );
}

function DayCell({
  dateKeyValue,
  day,
  isToday,
  isFuture,
  loading,
  onClick,
}: {
  dateKeyValue: string;
  day?: WearDay;
  isToday: boolean;
  isFuture: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const dayNumber = Number(dateKeyValue.slice(-2));
  const lead = day?.items[0];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${dateKeyValue}${day ? ", outfit logged" : ""}`}
      className={`relative aspect-square overflow-hidden rounded-xl border text-left transition active:scale-95 ${
        isToday
          ? "border-accent"
          : day
          ? "border-ink-600"
          : "border-ink-700 hover:border-ink-600"
      } ${isFuture ? "opacity-55" : ""} ${loading ? "skeleton" : "bg-ink-850"}`}
    >
      {lead && (
        <ItemThumb
          item={lead}
          className="absolute inset-0 h-full w-full opacity-70"
          sizes="80px"
        />
      )}
      <span
        className={`absolute left-1.5 top-1 text-[11px] font-semibold tabular-nums ${
          lead ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" : ""
        } ${isToday ? "text-accent" : lead ? "" : "text-[#9686a1]"}`}
      >
        {dayNumber}
      </span>
      {day && !lead && (
        <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent" />
      )}
    </button>
  );
}

function StatsPanel({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <aside className="card grid place-items-center p-6">
        <Spinner />
      </aside>
    );
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent">
            <FlameIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-2xl font-bold leading-none tabular-nums">
              {stats.streak}
            </p>
            <p className="mt-1 text-xs text-[#a99bb5]">
              day streak {stats.streak >= 3 ? "🔥" : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-700 pt-4">
          <Stat label="Outfits logged" value={stats.totalOutfitsLogged} />
          <Stat label="Items owned" value={stats.totalItems} />
        </div>
      </div>

      {stats.mostWornItem && (
        <div className="card p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#a99bb5]">
            Most worn
          </h3>
          <div className="flex items-center gap-3">
            <ItemThumb
              item={stats.mostWornItem}
              className="h-14 w-14 shrink-0 rounded-xl"
              sizes="56px"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {stats.mostWornItem.name}
              </p>
              <p className="text-xs text-[#a99bb5]">
                {wearCount(stats.mostWornItem.timesWorn)} ·{" "}
                {relativeDay(stats.mostWornItem.lastWornDate)}
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.favoriteOutfit && (
        <div className="card overflow-hidden">
          <h3 className="px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-[#a99bb5]">
            Favorite outfit
          </h3>
          <OutfitTiles
            items={stats.favoriteOutfit.items}
            className="aspect-[3/2] w-full"
          />
          <div className="p-4">
            <p className="truncate text-sm font-medium">
              {stats.favoriteOutfit.name}
            </p>
            <p className="text-xs text-[#a99bb5]">
              {wearCount(stats.favoriteOutfit.timesWorn)}
            </p>
          </div>
        </div>
      )}

      {stats.leastWornItems.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#a99bb5]">
            Gathering dust
          </h3>
          <p className="mb-3 text-[11px] text-[#83718e]">
            Not worn in 14+ days
          </p>
          <ul className="space-y-2.5">
            {stats.leastWornItems.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center gap-2.5">
                <ItemThumb
                  item={item}
                  className="h-9 w-9 shrink-0 rounded-lg"
                  sizes="36px"
                />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {item.name}
                </span>
                <span className="shrink-0 text-[10px] text-[#83718e]">
                  {relativeDay(item.lastWornDate)}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/wardrobe"
            className="mt-3 block text-center text-[11px] text-accent-soft hover:underline"
          >
            Go wear something new
          </Link>
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#a99bb5]">{label}</p>
    </div>
  );
}
