"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SuggestionCard from "@/components/SuggestionCard";
import ManualBuilder from "@/components/ManualBuilder";
import { EmptyState, SectionHeading } from "@/components/ui";
import { PlusIcon, SparkIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  fetchItems,
  generateOutfits,
  logWear,
  saveOutfit,
  type ClientItem,
  type Suggestion,
} from "@/lib/api";
import { LOADING_MESSAGES } from "@/lib/constants";
import { dateKey } from "@/lib/serialize";

type Mode = "auto" | "manual";

export default function OutfitsPage() {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("auto");
  const [items, setItems] = useState<ClientItem[] | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [wornIds, setWornIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    fetchItems()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  // Rotate the loading copy so a slow API call still feels alive.
  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setLoadingMessage(
        LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
      );
    }, 1400);
    return () => window.clearInterval(id);
  }, [loading]);

  const generate = useCallback(async () => {
    setLoading(true);
    setReason(null);
    try {
      const res = await generateOutfits({ count: 5 });
      setSuggestions(res.outfits);
      setReason(res.reason ?? null);
      setSavedIds(new Set());
      setWornIds(new Set());
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /** Replace a single card, keeping the others in place. */
  async function regenerateOne(index: number) {
    if (!suggestions) return;
    try {
      const res = await generateOutfits({
        count: 1,
        excludeSignatures: suggestions.map((s) => s.signature),
      });
      if (res.outfits.length === 0) {
        toast(res.reason || "No other combinations left", "error");
        return;
      }
      setSuggestions((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[index] = res.outfits[0];
        return next;
      });
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function save(s: Suggestion) {
    setBusy(true);
    try {
      await saveOutfit({
        name: s.name,
        styleNote: s.styleNote,
        items: s.items.map((i) => ({ itemId: i.item.id, slot: i.slot })),
      });
      setSavedIds((prev) => new Set(prev).add(s.signature));
      toast(`${s.name} saved`);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function wear(s: Suggestion) {
    setBusy(true);
    try {
      // Logging needs a persisted outfit, so save it on the way through.
      const outfit = await saveOutfit({
        name: s.name,
        styleNote: s.styleNote,
        items: s.items.map((i) => ({ itemId: i.item.id, slot: i.slot })),
      });
      await logWear({ date: dateKey(new Date()), outfitId: outfit.id });
      setSavedIds((prev) => new Set(prev).add(s.signature));
      setWornIds((prev) => new Set(prev).add(s.signature));
      toast("Logged for today");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  /** A dislike is stored so the outfit stays out of the saved library. */
  async function dislike(s: Suggestion, index: number) {
    setBusy(true);
    try {
      await saveOutfit({
        name: s.name,
        styleNote: s.styleNote,
        items: s.items.map((i) => ({ itemId: i.item.id, slot: i.slot })),
        disliked: true,
      });
      toast("Noted — won't suggest that one again");
      await regenerateOne(index);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const hasBasics =
    items !== null &&
    items.some((i) => i.category === "top") &&
    items.some((i) => i.category === "bottom");

  return (
    <div>
      <SectionHeading
        title="Outfits"
        subtitle="Let the app build fits from your closet, or put one together yourself."
      />

      <div
        role="tablist"
        aria-label="Outfit mode"
        className="mb-5 inline-flex rounded-xl border border-ink-700 bg-ink-850 p-1"
      >
        {(["auto", "manual"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === m
                ? "bg-ink-700 text-white"
                : "text-[#a99bb5] hover:text-white"
            }`}
          >
            {m === "auto" ? "Auto-generate" : "Manual build"}
          </button>
        ))}
      </div>

      {mode === "manual" ? (
        items === null ? (
          <LoadingGrid />
        ) : (
          <ManualBuilder items={items} />
        )
      ) : !hasBasics && items !== null ? (
        <EmptyState
          title="Add a top and a bottom first"
          body="The generator needs at least one top and one bottom to work with. Add a few pieces and it'll start building fits."
          action={
            <Link href="/wardrobe" className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Go to wardrobe
            </Link>
          }
        />
      ) : (
        <>
          <button
            className="btn-primary mb-5 w-full py-3.5 sm:w-auto sm:px-8"
            onClick={generate}
            disabled={loading}
          >
            <SparkIcon className="h-4 w-4" />
            {loading
              ? loadingMessage
              : suggestions
              ? "Generate new outfits"
              : "Generate outfits for me"}
          </button>

          {loading && <LoadingGrid />}

          {!loading && reason && (
            <EmptyState title="Nothing to suggest" body={reason} />
          )}

          {!loading && suggestions && suggestions.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={s.signature}
                  suggestion={s}
                  saved={savedIds.has(s.signature)}
                  worn={wornIds.has(s.signature)}
                  busy={busy}
                  onSave={() => save(s)}
                  onWear={() => wear(s)}
                  onDislike={() => dislike(s, i)}
                  onRegenerate={() => regenerateOne(i)}
                />
              ))}
            </div>
          )}

          {!loading && !suggestions && !reason && (
            <p className="text-sm text-[#a99bb5]">
              Tap the button and we&apos;ll put five fits together from what you
              own.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-[4/3] w-full" />
          <div className="space-y-2.5 p-4">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-4/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
