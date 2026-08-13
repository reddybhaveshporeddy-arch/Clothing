"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { ImageIcon, TrashIcon } from "./Icons";
import { ColorDot } from "./ui";
import { compressImage } from "@/lib/image";
import {
  classifyItemPhoto,
  createItem,
  deleteItem,
  updateItem,
  type ClientItem,
} from "@/lib/api";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  COLOR_OPTIONS,
  SEASONS,
  SEASON_LABELS,
  STYLE_TAGS,
  TYPES_BY_CATEGORY,
  type Category,
} from "@/lib/constants";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Present when editing; absent when adding. */
  item?: ClientItem | null;
  onSaved: (item: ClientItem) => void;
  onDeleted?: (id: number) => void;
};

type FormState = {
  name: string;
  category: Category;
  type: string;
  primaryColor: string;
  secondaryColor: string;
  styleTags: string[];
  season: string;
  notes: string;
};

const BLANK: FormState = {
  name: "",
  category: "top",
  type: "",
  primaryColor: "black",
  secondaryColor: "",
  styleTags: [],
  season: "all",
  notes: "",
};

export default function ItemForm({
  open,
  onClose,
  item,
  onSaved,
  onDeleted,
}: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(BLANK);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [classifying, setClassifying] = useState(false);

  // Reset whenever the sheet opens so a previous edit never bleeds through.
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setConfirmDelete(false);
    setClassifying(false);
    if (item) {
      setForm({
        name: item.name,
        category: item.category as Category,
        type: item.type,
        primaryColor: item.primaryColor,
        secondaryColor: item.secondaryColor ?? "",
        styleTags: item.styleTags,
        season: item.season,
        notes: item.notes ?? "",
      });
      setPreview(item.photoPath);
    } else {
      setForm(BLANK);
      setPreview(null);
    }
  }, [open, item]);

  // Object URLs for the local preview have to be released manually.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function handleFile(raw: File | undefined | null) {
    if (!raw) return;
    if (!raw.type.startsWith("image/")) {
      toast("That file isn't an image", "error");
      return;
    }
    const compressed = await compressImage(raw);
    setFile(compressed);

    // Auto-fill only for a brand-new item. Editing an existing one means
    // there's already real data on the form — a replaced photo shouldn't
    // silently overwrite a name or notes the person actually typed.
    if (item) return;

    setClassifying(true);
    try {
      const suggestion = await classifyItemPhoto(compressed);
      if (!suggestion) return;

      update({
        name: suggestion.name,
        category: suggestion.category as Category,
        // Fall back to empty so the dropdown shows "Choose..." rather than
        // silently keeping a value from the previous category.
        type: suggestion.type ?? "",
        primaryColor: suggestion.primaryColor,
        secondaryColor: suggestion.secondaryColor ?? "",
        styleTags: suggestion.styleTags,
        season: suggestion.season,
      });
      toast("Filled in from the photo — check it over before saving");
    } catch {
      // Vision classification is a nice-to-have; a failure here shouldn't
      // block adding the item, so the form just stays as the person left it.
    } finally {
      setClassifying(false);
    }
  }

  function toggleTag(tag: string) {
    update({
      styleTags: form.styleTags.includes(tag)
        ? form.styleTags.filter((t) => t !== tag)
        : [...form.styleTags, tag],
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) return toast("Give the item a name", "error");
    if (!form.type.trim()) return toast("Pick a type", "error");
    if (!item && !file) return toast("Add a photo of the item", "error");

    const fd = new FormData();
    fd.set("name", form.name.trim());
    fd.set("category", form.category);
    fd.set("type", form.type);
    fd.set("primaryColor", form.primaryColor.trim() || "black");
    fd.set("secondaryColor", form.secondaryColor.trim());
    fd.set("styleTags", JSON.stringify(form.styleTags));
    fd.set("season", form.season);
    fd.set("notes", form.notes.trim());
    if (file) fd.set("photo", file);

    setSaving(true);
    try {
      const saved = item
        ? await updateItem(item.id, fd)
        : await createItem(fd);
      toast(item ? "Item updated" : `${saved.name} added`);
      onSaved(saved);
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!item) return;
    setSaving(true);
    try {
      await deleteItem(item.id);
      toast(`${item.name} deleted`);
      onDeleted?.(item.id);
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  const types = TYPES_BY_CATEGORY[form.category] ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Edit item" : "Add item"}
      footer={
        <div className="flex items-center gap-2">
          {item && (
            <button
              type="button"
              className={confirmDelete ? "btn-danger" : "btn-subtle"}
              disabled={saving}
              onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
            >
              <TrashIcon className="h-4 w-4" />
              {confirmDelete ? "Tap to confirm" : "Delete"}
            </button>
          )}
          <div className="flex-1" />
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="item-form"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : item ? "Save changes" : "Add to wardrobe"}
          </button>
        </div>
      }
    >
      <form id="item-form" onSubmit={submit} className="space-y-5">
        {/* ---------------------------------------------------------- photo */}
        <div>
          <span className="label">Photo</span>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className={`relative flex h-48 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
              dragging
                ? "border-accent bg-accent/10"
                : "border-ink-600 bg-ink-800 hover:border-ink-500"
            }`}
          >
            {preview ? (
              <>
                <Image
                  src={preview}
                  alt="Item preview"
                  fill
                  sizes="(max-width: 640px) 100vw, 480px"
                  className="object-contain"
                  unoptimized={preview.startsWith("blob:")}
                />
                <span className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] text-white">
                  Tap to replace
                </span>
                {classifying && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-xs font-medium text-white">
                      Reading the photo...
                    </span>
                  </span>
                )}
              </>
            ) : (
              <div className="px-6 text-center text-sm text-[#9686a1]">
                <ImageIcon className="mx-auto mb-2 h-7 w-7" />
                Drop a photo here, or tap to choose one
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {/* ----------------------------------------------------------- name */}
        <div>
          <label className="label" htmlFor="item-name">
            Name
          </label>
          <input
            id="item-name"
            className="input"
            placeholder="Black Hollister Hoodie"
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>

        {/* ------------------------------------------------ category + type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="item-category">
              Category
            </label>
            <select
              id="item-category"
              className="input"
              value={form.category}
              onChange={(e) =>
                // Type belongs to the category, so it resets alongside it.
                update({ category: e.target.value as Category, type: "" })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="item-type">
              Type
            </label>
            <select
              id="item-type"
              className="input"
              value={form.type}
              onChange={(e) => update({ type: e.target.value })}
            >
              <option value="">Choose...</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* --------------------------------------------------------- colors */}
        <ColorField
          label="Primary color"
          value={form.primaryColor}
          onChange={(v) => update({ primaryColor: v })}
        />
        <ColorField
          label="Secondary color (optional)"
          value={form.secondaryColor}
          onChange={(v) => update({ secondaryColor: v })}
          allowClear
        />

        {/* ----------------------------------------------------- style tags */}
        <div>
          <span className="label">Style tags</span>
          <div className="flex flex-wrap gap-2">
            {STYLE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={form.styleTags.includes(tag)}
                onClick={() => toggleTag(tag)}
                className={`chip ${
                  form.styleTags.includes(tag) ? "chip-active" : ""
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* --------------------------------------------------------- season */}
        <div>
          <label className="label" htmlFor="item-season">
            Season
          </label>
          <select
            id="item-season"
            className="input"
            value={form.season}
            onChange={(e) => update({ season: e.target.value })}
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {SEASON_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* ---------------------------------------------------------- notes */}
        <div>
          <label className="label" htmlFor="item-notes">
            Notes (optional)
          </label>
          <textarea
            id="item-notes"
            className="input min-h-[72px] resize-y"
            placeholder="Slightly oversized"
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowClear = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowClear?: boolean;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.name}
            type="button"
            title={c.name}
            aria-label={c.name}
            aria-pressed={value.toLowerCase() === c.name}
            onClick={() => onChange(c.name)}
            className={`h-8 w-8 rounded-lg ring-1 transition ${
              value.toLowerCase() === c.name
                ? "ring-2 ring-accent"
                : "ring-white/15 hover:ring-white/40"
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="h-8 rounded-lg border border-ink-600 px-2.5 text-xs text-[#a99bb5] hover:text-white"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ColorDot color={value || "#8a8a8a"} size={18} />
        <input
          className="input"
          placeholder="or type a color — 'washed navy'"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
