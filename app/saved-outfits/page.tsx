"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import OutfitTiles from "@/components/OutfitTiles";
import {
  EmptyState,
  ItemThumb,
  ScoreBadge,
  SectionHeading,
  relativeDay,
} from "@/components/ui";
import {
  DownloadIcon,
  EditIcon,
  SparkIcon,
  TrashIcon,
} from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  deleteOutfit,
  fetchOutfits,
  logWear,
  updateOutfit,
  type ClientOutfit,
} from "@/lib/api";
import { dateKey } from "@/lib/serialize";

const SORTS = [
  { value: "worn", label: "Most worn" },
  { value: "recent", label: "Recently saved" },
  { value: "score", label: "Highest score" },
];

const SUGGESTED_TAGS = ["School", "Weekend", "Going out", "Lazy day", "Cold"];

export default function SavedOutfitsPage() {
  const toast = useToast();
  const [outfits, setOutfits] = useState<ClientOutfit[] | null>(null);
  const [sort, setSort] = useState("recent");
  const [tagFilter, setTagFilter] = useState("");
  const [editing, setEditing] = useState<ClientOutfit | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setOutfits(await fetchOutfits(sort, tagFilter || undefined));
    } catch (err) {
      toast((err as Error).message, "error");
      setOutfits([]);
    }
  }, [sort, tagFilter, toast]);

  useEffect(() => {
    setOutfits(null);
    load();
  }, [load]);

  async function wearToday(outfit: ClientOutfit) {
    setBusyId(outfit.id);
    try {
      await logWear({ date: dateKey(new Date()), outfitId: outfit.id });
      toast(`${outfit.name} logged for today`);
      load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(outfit: ClientOutfit) {
    setBusyId(outfit.id);
    try {
      await deleteOutfit(outfit.id);
      toast(`${outfit.name} deleted`);
      setOutfits((prev) => prev?.filter((o) => o.id !== outfit.id) ?? null);
      setEditing(null);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  const allTags = [
    ...new Set((outfits ?? []).flatMap((o) => o.tags)),
  ].sort();

  return (
    <div>
      <SectionHeading
        title="Saved outfits"
        subtitle={
          outfits === null
            ? "Loading..."
            : `${outfits.length} ${outfits.length === 1 ? "outfit" : "outfits"}`
        }
        right={
          <Link href="/outfits" className="btn-ghost">
            <SparkIcon className="h-4 w-4" />
            Build another
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSort(s.value)}
            aria-pressed={sort === s.value}
            className={`chip ${sort === s.value ? "chip-active" : ""}`}
          >
            {s.label}
          </button>
        ))}
        {allTags.length > 0 && <span className="h-5 w-px bg-ink-600" />}
        {allTags.map((t) => (
          <button
            key={t}
            onClick={() => setTagFilter(tagFilter === t ? "" : t)}
            aria-pressed={tagFilter === t}
            className={`chip ${tagFilter === t ? "chip-active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {outfits === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-[4/3] w-full" />
              <div className="space-y-2 p-4">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : outfits.length === 0 ? (
        <EmptyState
          title={tagFilter ? "No outfits with that tag" : "No saved outfits yet"}
          body={
            tagFilter
              ? "Try a different tag, or clear the filter."
              : "Generate a few fits and save the ones you'd actually wear. They'll show up here."
          }
          action={
            <Link href="/outfits" className="btn-primary">
              <SparkIcon className="h-4 w-4" />
              Generate outfits
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              busy={busyId === outfit.id}
              onWear={() => wearToday(outfit)}
              onEdit={() => setEditing(outfit)}
              onDelete={() => remove(outfit)}
            />
          ))}
        </div>
      )}

      <EditOutfitModal
        outfit={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setOutfits(
            (prev) =>
              prev?.map((o) => (o.id === updated.id ? updated : o)) ?? null
          );
          setEditing(null);
        }}
        onDelete={remove}
      />
    </div>
  );
}

function OutfitCard({
  outfit,
  busy,
  onWear,
  onEdit,
  onDelete,
}: {
  outfit: ClientOutfit;
  busy: boolean;
  onWear: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  /** Render the card to a PNG the user can share. */
  async function exportImage() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#1e1725",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${outfit.name.replace(/[^a-z0-9]+/gi, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <article
      ref={cardRef}
      className="card animate-fade-up overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
    >
      <OutfitTiles items={outfit.items} className="aspect-[4/3] w-full" />

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-[16px] font-medium">
              {outfit.name}
            </h3>
            <p className="mt-0.5 text-xs text-[#a99bb5]">
              Worn {outfit.timesWorn}× · {relativeDay(outfit.lastWornDate)}
            </p>
          </div>
          <ScoreBadge score={outfit.score} />
        </div>

        {outfit.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {outfit.tags.map((t) => (
              <span
                key={t}
                className="rounded-md bg-ink-750 px-2 py-0.5 text-[10px] font-medium text-[#b8adc0]"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {outfit.styleNote && (
          <p className="line-clamp-3 text-[13px] leading-relaxed text-[#b3a5bd]">
            {outfit.styleNote}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <button className="btn-primary flex-1" onClick={onWear} disabled={busy}>
            Wear today
          </button>
          <button
            className="btn-subtle px-2.5"
            onClick={onEdit}
            aria-label="Edit outfit"
          >
            <EditIcon className="h-4 w-4" />
          </button>
          <button
            className="btn-subtle px-2.5"
            onClick={exportImage}
            disabled={exporting}
            aria-label="Export as image"
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
          <button
            className="btn-subtle px-2.5 text-red-400/80 hover:text-red-300"
            onClick={onDelete}
            disabled={busy}
            aria-label="Delete outfit"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function EditOutfitModal({
  outfit,
  onClose,
  onSaved,
  onDelete,
}: {
  outfit: ClientOutfit | null;
  onClose: () => void;
  onSaved: (outfit: ClientOutfit) => void;
  onDelete: (outfit: ClientOutfit) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!outfit) return;
    setName(outfit.name);
    setTags(outfit.tags);
    setCustom("");
  }, [outfit]);

  function toggleTag(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  function addCustom() {
    const value = custom.trim();
    if (!value) return;
    if (!tags.includes(value)) setTags((t) => [...t, value]);
    setCustom("");
  }

  async function save() {
    if (!outfit) return;
    setSaving(true);
    try {
      const updated = await updateOutfit(outfit.id, {
        name: name.trim() || outfit.name,
        tags,
      });
      toast("Outfit updated");
      onSaved(updated);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(outfit)}
      onClose={onClose}
      title="Edit outfit"
      footer={
        <div className="flex items-center gap-2">
          <button
            className="btn-subtle text-red-400/80"
            onClick={() => outfit && onDelete(outfit)}
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
          <div className="flex-1" />
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      }
    >
      {outfit && (
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="outfit-name">
              Name
            </label>
            <input
              id="outfit-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <span className="label">Tags</span>
            <div className="mb-2.5 flex flex-wrap gap-2">
              {[...new Set([...SUGGESTED_TAGS, ...tags])].map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tags.includes(t)}
                  onClick={() => toggleTag(t)}
                  className={`chip ${tags.includes(t) ? "chip-active" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Add your own tag"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
              <button className="btn-ghost" type="button" onClick={addCustom}>
                Add
              </button>
            </div>
          </div>

          <div>
            <span className="label">Items</span>
            <ul className="space-y-2">
              {outfit.items.map((oi) => (
                <li key={oi.id} className="flex items-center gap-3">
                  <ItemThumb
                    item={oi.item}
                    className="h-10 w-10 shrink-0 rounded-lg"
                    sizes="40px"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {oi.item.name}
                  </span>
                  <span className="badge">{oi.slot}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] text-[#83718e]">
              To change the pieces, build a new outfit in the Outfits tab.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
