"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Modal from "@/components/Modal";
import AvatarCropper from "@/components/AvatarCropper";
import { ProfileAvatar, Spinner } from "@/components/ui";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  createProfile,
  deleteProfile,
  fetchProfiles,
  selectProfile,
  updateProfile,
  type ProfileSummary,
} from "@/lib/api";
import { PROFILE_COLORS, PROFILE_EMOJI } from "@/lib/constants";

export default function ProfilesPage() {
  return (
    <Suspense fallback={null}>
      <Profiles />
    </Suspense>
  );
}

function Profiles() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const manageMode = params.get("manage") === "1";
  const editParam = params.get("edit");

  const [profiles, setProfiles] = useState<ProfileSummary[] | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [managing, setManaging] = useState(manageMode);

  const load = useCallback(async () => {
    try {
      const res = await fetchProfiles();
      setProfiles(res.profiles);
      setActiveId(res.activeProfileId);
      // A completely empty instance goes straight to "create the first one".
      if (res.profiles.length === 0) {
        setEditing(null);
        setFormOpen(true);
        return;
      }
      // Deep-linked from the top bar's "Edit name, photo & color".
      if (editParam) {
        const target = res.profiles.find((p) => p.id === Number(editParam));
        if (target) {
          setEditing(target);
          setFormOpen(true);
        }
      }
    } catch (err) {
      toast((err as Error).message, "error");
      setProfiles([]);
    }
  }, [toast, editParam]);

  useEffect(() => {
    load();
  }, [load]);

  async function pick(profile: ProfileSummary) {
    setBusy(true);
    try {
      const res = await selectProfile(profile.id);
      // A brand-new profile hasn't taken the style quiz yet.
      router.push(res.profile.hasCompletedQuiz ? "/" : "/onboarding");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(profile: ProfileSummary) {
    setEditing(profile);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-5 py-12">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-2xl font-medium italic tracking-tight sm:text-3xl">
          Who&apos;s using this?
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#a99bb5]">
          Everyone gets their own wardrobe, outfits and history. Pick yours —
          this device will remember it.
        </p>
      </div>

      {profiles === null ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-6">
            {profiles.map((p) => (
              <ProfileTile
                key={p.id}
                profile={p}
                active={p.id === activeId}
                managing={managing}
                busy={busy}
                onPick={() => pick(p)}
                onEdit={() => openEdit(p)}
                onDeleted={() => {
                  setProfiles((prev) =>
                    prev?.filter((x) => x.id !== p.id) ?? null
                  );
                  if (p.id === activeId) setActiveId(null);
                }}
              />
            ))}

            <button
              type="button"
              onClick={openCreate}
              className="group flex w-24 flex-col items-center gap-2.5 sm:w-28"
            >
              <span className="grid aspect-square w-full place-items-center rounded-2xl border-2 border-dashed border-ink-600 text-[#83718e] transition group-hover:border-accent group-hover:text-accent">
                <PlusIcon className="h-7 w-7" />
              </span>
              <span className="text-sm font-medium text-[#a99bb5] transition group-hover:text-white">
                Add profile
              </span>
            </button>
          </div>

          {profiles.length > 0 && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setManaging((m) => !m)}
                className="btn-subtle text-xs"
              >
                {managing ? "Done" : "Manage profiles"}
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-[11px] leading-relaxed text-[#6f5f7c]">
            Profiles keep wardrobes separate — they aren&apos;t passwords.
            Anyone who can open this app can pick any profile.
          </p>
        </>
      )}

      <ProfileFormModal
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        firstEver={profiles?.length === 0}
        existingNames={(profiles ?? [])
          .filter((p) => p.id !== editing?.id)
          .map((p) => p.name.toLowerCase())}
        onCreated={async (profile) => {
          setFormOpen(false);
          setProfiles((prev) => [...(prev ?? []), profile]);
          await pick(profile);
        }}
        onUpdated={(profile) => {
          setFormOpen(false);
          setProfiles(
            (prev) => prev?.map((p) => (p.id === profile.id ? profile : p)) ?? null
          );
        }}
      />
    </div>
  );
}

function ProfileTile({
  profile,
  active,
  managing,
  busy,
  onPick,
  onEdit,
  onDeleted,
}: {
  profile: ProfileSummary;
  active: boolean;
  managing: boolean;
  busy: boolean;
  onPick: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await deleteProfile(profile.id);
      toast(`${profile.name}'s wardrobe deleted`);
      onDeleted();
    } catch (err) {
      toast((err as Error).message, "error");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="relative w-24 sm:w-28">
      <button
        type="button"
        onClick={managing ? onEdit : onPick}
        disabled={busy || deleting}
        className="group flex w-full flex-col items-center gap-2.5 disabled:opacity-50"
      >
        <ProfileAvatar
          profile={profile}
          className={`aspect-square w-full rounded-2xl text-3xl transition-transform duration-200 group-hover:scale-105 ${
            active ? "ring-2 ring-accent ring-offset-2 ring-offset-ink-900" : ""
          }`}
        />
        <span className="w-full">
          <span className="block truncate text-sm font-medium">
            {profile.name}
          </span>
          <span className="block text-[11px] text-[#9686a1]">
            {managing
              ? "Tap to edit"
              : `${profile.itemCount} ${profile.itemCount === 1 ? "item" : "items"}`}
          </span>
        </span>
      </button>

      {managing && (
        <button
          type="button"
          aria-label={`Delete ${profile.name}`}
          onClick={() => (confirming ? remove() : setConfirming(true))}
          disabled={deleting}
          className={`absolute -right-1.5 -top-1.5 rounded-full p-1.5 text-white shadow-lg transition ${
            confirming ? "bg-red-600 px-2 text-[10px]" : "bg-ink-700 hover:bg-red-700"
          }`}
        >
          {confirming ? "Delete?" : <TrashIcon className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

function ProfileFormModal({
  open,
  editing,
  onClose,
  onCreated,
  onUpdated,
  firstEver,
  existingNames,
}: {
  open: boolean;
  editing: ProfileSummary | null;
  onClose: () => void;
  onCreated: (profile: ProfileSummary) => void;
  onUpdated: (profile: ProfileSummary) => void;
  firstEver: boolean;
  existingNames: string[];
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROFILE_COLORS[0]);
  const [emoji, setEmoji] = useState<string>(PROFILE_EMOJI[0]);
  const [saving, setSaving] = useState(false);

  // Photo state: `photoFile` is the cropped result ready to upload;
  // `removePhoto` marks that an existing photo should be cleared;
  // `cropping` holds a just-picked file while the cropper is open.
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [cropping, setCropping] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setCropping(null);
    setPhotoFile(null);
    setRemovePhoto(false);

    if (editing) {
      setName(editing.name);
      setColor(editing.color);
      setEmoji(editing.emoji ?? "");
      setExistingPhotoPath(editing.photoPath);
      setPhotoPreview(null);
    } else {
      setName("");
      setExistingPhotoPath(null);
      setPhotoPreview(null);
      // Vary the default so a second profile doesn't look identical to the first.
      const i = existingNames.length % PROFILE_COLORS.length;
      setColor(PROFILE_COLORS[i]);
      setEmoji(PROFILE_EMOJI[existingNames.length % PROFILE_EMOJI.length]);
    }
  }, [open, editing, existingNames.length]);

  // Object URLs for the cropped preview have to be released manually.
  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function handleFilePicked(raw: File | undefined | null) {
    if (!raw) return;
    if (!raw.type.startsWith("image/")) {
      toast("That file isn't an image", "error");
      return;
    }
    setCropping(raw);
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast("Pick a name", "error");
    if (existingNames.includes(trimmed.toLowerCase())) {
      return toast(`There's already a profile called ${trimmed}`, "error");
    }

    setSaving(true);
    try {
      if (editing) {
        const { profile } = await updateProfile(editing.id, {
          name: trimmed,
          color,
          emoji: emoji || null,
          // undefined = leave the photo alone; a File = replace it;
          // null = the explicit "remove" signal.
          photo: photoFile ?? (removePhoto ? null : undefined),
        });
        toast("Profile updated");
        onUpdated(profile);
      } else {
        const profile = await createProfile({
          name: trimmed,
          color,
          emoji,
          photo: photoFile,
        });
        onCreated(profile);
      }
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  const avatarPhoto = photoPreview || (!removePhoto ? existingPhotoPath : null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        cropping
          ? "Position the photo"
          : editing
          ? "Edit profile"
          : firstEver
          ? "Create your profile"
          : "Add a profile"
      }
      footer={
        cropping ? undefined : (
          <div className="flex justify-end gap-2">
            {!(firstEver && !editing) && (
              <button className="btn-ghost" onClick={onClose} type="button">
                Cancel
              </button>
            )}
            <button
              type="submit"
              form="profile-form"
              className="btn-primary"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editing
                ? "Save changes"
                : "Create profile"}
            </button>
          </div>
        )
      }
    >
      {cropping ? (
        <AvatarCropper
          file={cropping}
          onCancel={() => setCropping(null)}
          onConfirm={(blob) => {
            setPhotoFile(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
            setRemovePhoto(false);
            setCropping(null);
          }}
        />
      ) : (
        <form id="profile-form" onSubmit={submit} className="space-y-5">
          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative"
              aria-label="Choose a photo"
            >
              <ProfileAvatar
                profile={{ name, color, emoji, photoPath: avatarPhoto }}
                className="h-20 w-20 rounded-2xl text-4xl"
              />
              <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/0 text-transparent transition group-hover:bg-black/50 group-hover:text-white">
                <EditIcon className="h-5 w-5" />
              </span>
            </button>
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="font-medium text-accent-soft hover:underline"
              >
                {avatarPhoto ? "Change photo" : "Add a photo"}
              </button>
              {avatarPhoto && (
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="font-medium text-[#83718e] hover:text-white hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleFilePicked(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div>
            <label className="label" htmlFor="profile-name">
              Name
            </label>
            <input
              id="profile-name"
              className="input"
              placeholder="Your name"
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <span className="label">Color</span>
            <p className="mb-2 text-[11px] text-[#6f5f7c]">
              Used when there&apos;s no photo.
            </p>
            <div className="flex flex-wrap gap-2">
              {PROFILE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-xl transition ${
                    color === c
                      ? "ring-2 ring-white"
                      : "ring-1 ring-white/15 hover:ring-white/40"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="label">Icon</span>
            <div className="flex flex-wrap gap-2">
              {PROFILE_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={emoji === e}
                  onClick={() => setEmoji(emoji === e ? "" : e)}
                  className={`grid h-9 w-9 place-items-center rounded-xl text-lg transition ${
                    emoji === e
                      ? "bg-ink-700 ring-2 ring-accent"
                      : "bg-ink-800 hover:bg-ink-750"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
