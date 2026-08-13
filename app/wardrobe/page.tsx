"use client";

import { useEffect, useMemo, useState } from "react";
import ItemCard from "@/components/ItemCard";
import ItemForm from "@/components/ItemForm";
import ColorWheel from "@/components/ColorWheel";
import { EmptyState, SectionHeading } from "@/components/ui";
import { PlusIcon, SearchIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { fetchItems, type ClientItem } from "@/lib/api";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  SEASONS,
  SEASON_LABELS,
  STYLE_TAGS,
} from "@/lib/constants";

export default function WardrobePage() {
  const toast = useToast();
  const [items, setItems] = useState<ClientItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [season, setSeason] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientItem | null>(null);

  useEffect(() => {
    fetchItems()
      .then(setItems)
      .catch((e) => {
        toast((e as Error).message, "error");
        setItems([]);
      });
  }, [toast]);

  // Filtering is client-side: the whole wardrobe is small enough to hold in
  // memory, and it keeps the filter bar instant.
  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (category && i.category !== category) return false;
      if (season && i.season !== season) return false;
      if (tag && !i.styleTags.includes(tag)) return false;
      if (q) {
        const haystack = `${i.name} ${i.type} ${i.primaryColor} ${
          i.notes ?? ""
        }`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, category, season, tag]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items ?? []) {
      map.set(i.category, (map.get(i.category) || 0) + 1);
    }
    return map;
  }, [items]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: ClientItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function onSaved(saved: ClientItem) {
    setItems((prev) => {
      if (!prev) return [saved];
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
  }

  function onDeleted(id: number) {
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
  }

  const hasFilters = Boolean(search || category || tag || season);

  return (
    <div>
      <SectionHeading
        title="Wardrobe"
        subtitle={
          items === null
            ? "Loading your closet..."
            : `${items.length} ${items.length === 1 ? "item" : "items"}`
        }
        right={
          <button className="btn-primary" onClick={openAdd}>
            <PlusIcon className="h-4 w-4" />
            Add item
          </button>
        }
      />

      {items !== null && items.length > 0 && (
        <>
          {/* ------------------------------------------------- filter bar */}
          <div className="card mb-5 space-y-3 p-3.5">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#83718e]" />
              <input
                className="input pl-9"
                placeholder="Search by name, type or color"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search wardrobe"
              />
            </div>

            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <FilterChip
                label={`All (${items.length})`}
                active={!category}
                onClick={() => setCategory("")}
              />
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c}
                  label={`${CATEGORY_LABELS[c]} (${counts.get(c) || 0})`}
                  active={category === c}
                  onClick={() => setCategory(category === c ? "" : c)}
                />
              ))}
            </div>

            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {STYLE_TAGS.map((t) => (
                <FilterChip
                  key={t}
                  label={t}
                  active={tag === t}
                  onClick={() => setTag(tag === t ? "" : t)}
                />
              ))}
              <span className="w-px shrink-0 bg-ink-600" />
              {SEASONS.filter((s) => s !== "all").map((s) => (
                <FilterChip
                  key={s}
                  label={SEASON_LABELS[s]}
                  active={season === s}
                  onClick={() => setSeason(season === s ? "" : s)}
                />
              ))}
              {hasFilters && (
                <button
                  className="chip shrink-0 border-transparent text-accent-soft"
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                    setTag("");
                    setSeason("");
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <ColorWheel items={items} />
        </>
      )}

      {items === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-square w-full" />
              <div className="space-y-2 p-3">
                <div className="skeleton h-3.5 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Your closet is empty"
          body="Add a few photos of what you actually wear — tops and bottoms first. Once you have a couple of each, the outfit generator kicks in."
          action={
            <button className="btn-primary" onClick={openAdd}>
              <PlusIcon className="h-4 w-4" />
              Add your first item
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          body="Try widening your search or clearing a filter."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} onEdit={openEdit} />
          ))}
        </div>
      )}

      <ItemForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        item={editing}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`chip shrink-0 ${active ? "chip-active" : ""}`}
    >
      {label}
    </button>
  );
}
