"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import OutfitTiles from "./OutfitTiles";
import { ScoreBadge, Spinner } from "./ui";
import { useToast } from "./Toast";
import { SparkIcon } from "./Icons";
import {
  fetchOutfits,
  generateOutfits,
  logWear,
  saveOutfit,
  type ClientOutfit,
  type Suggestion,
} from "@/lib/api";

/**
 * Pick what was worn on a given day: either a saved outfit, or a freshly
 * generated one (which gets saved on the way through so it has an id to log).
 */
export default function LogOutfitPicker({
  date,
  onClose,
  onLogged,
}: {
  date: string | null;
  onClose: () => void;
  onLogged: () => void;
}) {
  const toast = useToast();
  const [saved, setSaved] = useState<ClientOutfit[] | null>(null);
  const [fresh, setFresh] = useState<Suggestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!date) return;
    setSaved(null);
    setFresh([]);
    fetchOutfits("worn")
      .then(setSaved)
      .catch(() => setSaved([]));
  }, [date]);

  async function generate() {
    setGenerating(true);
    try {
      const res = await generateOutfits({ count: 3 });
      setFresh(res.outfits);
      if (res.outfits.length === 0 && res.reason) toast(res.reason, "error");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setGenerating(false);
    }
  }

  async function logSaved(outfit: ClientOutfit) {
    if (!date) return;
    setBusy(true);
    try {
      await logWear({ date, outfitId: outfit.id });
      toast(`Logged ${outfit.name}`);
      onLogged();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function logFresh(s: Suggestion) {
    if (!date) return;
    setBusy(true);
    try {
      const outfit = await saveOutfit({
        name: s.name,
        styleNote: s.styleNote,
        items: s.items.map((i) => ({ itemId: i.item.id, slot: i.slot })),
      });
      await logWear({ date, outfitId: outfit.id });
      toast(`Logged ${s.name}`);
      onLogged();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const label = date
    ? new Date(date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <Modal
      open={Boolean(date)}
      onClose={onClose}
      title={`Log an outfit — ${label}`}
      wide
    >
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Saved outfits</h3>
            <button
              className="btn-subtle text-xs"
              onClick={generate}
              disabled={generating}
            >
              <SparkIcon className="h-3.5 w-3.5" />
              {generating ? "Building..." : "Generate new"}
            </button>
          </div>

          {saved === null ? (
            <div className="grid place-items-center py-8">
              <Spinner />
            </div>
          ) : saved.length === 0 ? (
            <p className="rounded-xl bg-ink-850 p-4 text-sm text-[#a99bb5]">
              No saved outfits yet — generate one instead.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {saved.map((o) => (
                <button
                  key={o.id}
                  onClick={() => logSaved(o)}
                  disabled={busy}
                  className="card overflow-hidden text-left transition hover:border-accent/60 disabled:opacity-60"
                >
                  <OutfitTiles items={o.items} className="aspect-square w-full" />
                  <div className="p-2.5">
                    <p className="truncate text-xs font-medium">{o.name}</p>
                    <p className="mt-0.5 text-[10px] text-[#9686a1]">
                      Worn {o.timesWorn}×
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {fresh.length > 0 && (
          <section className="animate-fade-up">
            <h3 className="mb-3 text-sm font-semibold">Fresh suggestions</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fresh.map((s) => (
                <button
                  key={s.signature}
                  onClick={() => logFresh(s)}
                  disabled={busy}
                  className="card overflow-hidden text-left transition hover:border-accent/60 disabled:opacity-60"
                >
                  <OutfitTiles items={s.items} className="aspect-square w-full" />
                  <div className="flex items-center justify-between gap-1 p-2.5">
                    <p className="truncate text-xs font-medium">{s.name}</p>
                    <ScoreBadge score={s.score} size="sm" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
