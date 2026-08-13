"use client";

import { useEffect, useMemo, useState } from "react";
import { ColorDot, EmptyState, ItemThumb, ScoreBadge, Spinner } from "./ui";
import { CloseIcon, PlusIcon } from "./Icons";
import { useToast } from "./Toast";
import {
  fetchStyleNote,
  saveOutfit,
  logWear,
  type ClientItem,
  type ScoreBreakdown,
} from "@/lib/api";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";
import { distinctColors, isNeutral, isSaturated } from "@/lib/colors";
import { dateKey } from "@/lib/serialize";

type Slot = "top" | "bottom" | "outerwear" | "shoes" | "accessory";

const SLOTS: { key: Slot; label: string; required: boolean }[] = [
  { key: "top", label: "Top", required: true },
  { key: "bottom", label: "Bottom", required: true },
  { key: "outerwear", label: "Outerwear", required: false },
  { key: "shoes", label: "Shoes", required: false },
  { key: "accessory", label: "Accessory", required: false },
];

export default function ManualBuilder({ items }: { items: ClientItem[] }) {
  const toast = useToast();
  const [slots, setSlots] = useState<Partial<Record<Slot, ClientItem>>>({});
  const [dragOver, setDragOver] = useState<Slot | null>(null);
  const [pickerFor, setPickerFor] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [scoring, setScoring] = useState(false);

  const chosen = useMemo(
    () =>
      SLOTS.map((s) => ({ slot: s.key, item: slots[s.key] })).filter(
        (s): s is { slot: Slot; item: ClientItem } => Boolean(s.item)
      ),
    [slots]
  );

  const ready = Boolean(slots.top && slots.bottom);

  // Re-score whenever the selection changes. The server owns the scoring
  // formula, so the live score always matches what gets saved.
  useEffect(() => {
    if (chosen.length < 2) {
      setBreakdown(null);
      setNote(null);
      return;
    }
    let cancelled = false;
    setScoring(true);
    const timer = window.setTimeout(() => {
      fetchStyleNote(chosen.map((c) => c.item.id))
        .then((res) => {
          if (cancelled) return;
          setBreakdown(res.breakdown);
          setNote(res.styleNote);
        })
        .catch(() => {})
        .finally(() => !cancelled && setScoring(false));
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen.map((c) => c.item.id).join(",")]);

  const harmony = useMemo(() => colorHarmony(chosen.map((c) => c.item)), [chosen]);

  function assign(slot: Slot, item: ClientItem) {
    setSlots((s) => ({ ...s, [slot]: item }));
    setPickerFor(null);
  }

  function clear(slot: Slot) {
    setSlots((s) => {
      const next = { ...s };
      delete next[slot];
      return next;
    });
  }

  /** Where an item lands when dropped without a target slot in mind. */
  function defaultSlot(item: ClientItem): Slot {
    return (SLOTS.find((s) => s.key === item.category)?.key ?? "accessory") as Slot;
  }

  async function persist(alsoWear: boolean) {
    if (!ready) {
      toast("Add at least a top and a bottom", "error");
      return null;
    }
    setBusy(true);
    try {
      const outfit = await saveOutfit({
        name: name.trim() || "My Outfit",
        styleNote: note,
        tags: [],
        items: chosen.map((c) => ({ itemId: c.item.id, slot: c.slot })),
      });
      if (alsoWear) {
        await logWear({ date: dateKey(new Date()), outfitId: outfit.id });
      }
      toast(alsoWear ? "Saved and logged for today" : "Outfit saved");
      setSlots({});
      setName("");
      setNote(null);
      setBreakdown(null);
      return outfit;
    } catch (err) {
      toast((err as Error).message, "error");
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing to build with yet"
        body="Add some clothes to your wardrobe first, then come back and put a fit together."
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* ------------------------------------------------------- slot board */}
      <div className="space-y-4">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <input
              className="input max-w-xs"
              placeholder="Name this outfit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Outfit name"
            />
            <div className="flex items-center gap-2">
              {scoring && <Spinner className="h-4 w-4" />}
              {breakdown && <ScoreBadge score={breakdown.total} />}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SLOTS.map(({ key, label, required }) => {
              const item = slots[key];
              return (
                <div
                  key={key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(key);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = Number(e.dataTransfer.getData("text/plain"));
                    const dropped = items.find((i) => i.id === id);
                    if (dropped) assign(key, dropped);
                  }}
                  className={`relative flex aspect-square flex-col overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
                    dragOver === key
                      ? "border-accent bg-accent/10"
                      : item
                      ? "border-transparent"
                      : "border-ink-600 bg-ink-800"
                  }`}
                >
                  {item ? (
                    <>
                      <ItemThumb
                        item={item}
                        className="h-full w-full"
                        sizes="180px"
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => clear(key)}
                        className="absolute right-1.5 top-1.5 rounded-lg bg-black/70 p-1 text-white transition hover:bg-black"
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-6 text-[11px] font-medium">
                        {item.name}
                      </span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPickerFor(key)}
                      className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[#83718e] transition hover:text-white"
                    >
                      <PlusIcon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                      {required && (
                        <span className="text-[10px] text-[#6f5f7c]">
                          required
                        </span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ----------------------------------------------- live feedback */}
        {chosen.length >= 2 && (
          <div className="card animate-fade-up space-y-3 p-4">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: harmony.dotColor }}
              />
              <span className="text-sm font-medium">{harmony.label}</span>
              <div className="ml-auto flex -space-x-1">
                {harmony.colors.map((c) => (
                  <ColorDot key={c} color={c} size={16} />
                ))}
              </div>
            </div>
            {note && (
              <p className="rounded-xl bg-ink-850 p-3 text-[13px] leading-relaxed text-[#d6cddc]">
                {note}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary"
                onClick={() => persist(false)}
                disabled={!ready || busy}
              >
                Save this outfit
              </button>
              <button
                className="btn-ghost"
                onClick={() => persist(true)}
                disabled={!ready || busy}
              >
                Save &amp; wear today
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------- sidebar */}
      <aside className="card flex max-h-[70dvh] flex-col overflow-hidden lg:sticky lg:top-20">
        <div className="border-b border-ink-700 px-4 py-3">
          <h3 className="text-sm font-semibold">Your wardrobe</h3>
          <p className="mt-0.5 text-xs text-[#a99bb5]">
            Drag an item onto a slot, or tap it.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {CATEGORIES.map((cat) => {
            const inCat = items.filter((i) => i.category === cat);
            if (inCat.length === 0) return null;
            return (
              <section key={cat} className="mb-4 last:mb-0">
                <h4 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[#83718e]">
                  {CATEGORY_LABELS[cat as Category]}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {inCat.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", String(item.id))
                      }
                      onClick={() => assign(defaultSlot(item), item)}
                      title={item.name}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-ink-700 transition hover:border-accent/60 active:scale-95"
                    >
                      <ItemThumb
                        item={item}
                        className="h-full w-full"
                        sizes="90px"
                      />
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </aside>

      {/* ----------------------------------------------------- slot picker */}
      {pickerFor && (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="animate-fade-in absolute inset-0 bg-black/70"
            onClick={() => setPickerFor(null)}
          />
          <div className="animate-scale-in relative max-h-[70dvh] w-full overflow-y-auto rounded-t-3xl border border-ink-700 bg-ink-850 p-4 sm:max-w-lg sm:rounded-2xl">
            <h3 className="mb-3 text-sm font-semibold">
              Pick a {SLOTS.find((s) => s.key === pickerFor)?.label.toLowerCase()}
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items
                .filter(
                  (i) =>
                    i.category === pickerFor ||
                    // Let anything fill the accessory slot.
                    pickerFor === "accessory"
                )
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => assign(pickerFor, item)}
                    className="overflow-hidden rounded-xl border border-ink-700 transition hover:border-accent/60"
                  >
                    <ItemThumb
                      item={item}
                      className="aspect-square w-full"
                      sizes="110px"
                    />
                    <span className="block truncate px-1.5 py-1 text-[11px]">
                      {item.name}
                    </span>
                  </button>
                ))}
            </div>
            {items.filter((i) => i.category === pickerFor).length === 0 &&
              pickerFor !== "accessory" && (
                <p className="py-6 text-center text-sm text-[#a99bb5]">
                  Nothing in this category yet.
                </p>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Live color-harmony readout for the builder. Mirrors the engine's rules. */
function colorHarmony(items: ClientItem[]): {
  label: string;
  dotColor: string;
  colors: string[];
} {
  const raw: string[] = [];
  for (const i of items) {
    raw.push(i.primaryColor);
    if (i.secondaryColor) raw.push(i.secondaryColor);
  }
  const colors = distinctColors(raw);
  const loud = colors.filter((c) => isSaturated(c));
  const nonNeutral = colors.filter((c) => !isNeutral(c));

  if (colors.length > 3) {
    return { label: "Busy — a lot going on", dotColor: "#e5b833", colors };
  }
  if (nonNeutral.length === 0) {
    return { label: "All neutrals — clean", dotColor: "#34d399", colors };
  }
  if (loud.length >= 2) {
    return { label: "Two loud colors competing", dotColor: "#f87171", colors };
  }
  return { label: "Balanced — color on neutrals", dotColor: "#34d399", colors };
}
