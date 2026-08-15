import type { ClientItem, ClientOutfit, ClientProfile } from "./serialize";

export type { ClientItem, ClientOutfit, ClientProfile };

/** Thrown when the server has no profile selected for this device. */
export class NoProfileError extends Error {
  constructor() {
    super("No profile selected");
    this.name = "NoProfileError";
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body: { error?: string; code?: string } = await res
      .json()
      .catch(() => ({}));
    if (body.code === "NO_PROFILE") throw new NoProfileError();
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ------------------------------------------------------------------ profiles

export type ProfileSummary = {
  id: number;
  name: string;
  color: string;
  emoji: string | null;
  photoPath: string | null;
  itemCount: number;
  hasCompletedQuiz: boolean;
};

export async function fetchProfiles() {
  const res = await fetch("/api/profiles", { cache: "no-store" });
  return json<{ profiles: ProfileSummary[]; activeProfileId: number | null }>(
    res
  );
}

export async function createProfile(input: {
  name: string;
  color?: string;
  emoji?: string | null;
  photo?: File | null;
}) {
  let res: Response;
  if (input.photo) {
    const fd = new FormData();
    fd.set("name", input.name);
    if (input.color) fd.set("color", input.color);
    fd.set("emoji", input.emoji ?? "");
    fd.set("photo", input.photo);
    res = await fetch("/api/profiles", { method: "POST", body: fd });
  } else {
    res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }
  return (await json<{ profile: ProfileSummary }>(res)).profile;
}

export async function updateProfile(
  id: number,
  patch: {
    name?: string;
    color?: string;
    emoji?: string | null;
    /** A new photo to upload, or `null` to remove the existing one. */
    photo?: File | null;
  }
) {
  let res: Response;
  if (patch.photo !== undefined) {
    const fd = new FormData();
    if (patch.name !== undefined) fd.set("name", patch.name);
    if (patch.color !== undefined) fd.set("color", patch.color);
    if (patch.emoji !== undefined) fd.set("emoji", patch.emoji ?? "");
    if (patch.photo) {
      fd.set("photo", patch.photo);
    } else {
      // No file to attach — this flag is how "remove the photo" is spelled,
      // since an absent form field just means "leave it as-is".
      fd.set("removePhoto", "1");
    }
    res = await fetch(`/api/profiles/${id}`, { method: "PATCH", body: fd });
  } else {
    res = await fetch(`/api/profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }
  return json<{ profile: ProfileSummary }>(res);
}

export async function deleteProfile(id: number) {
  const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
  return json<{ ok: true }>(res);
}

export async function selectProfile(profileId: number) {
  const res = await fetch("/api/profiles/select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId }),
  });
  return json<{
    profile: {
      id: number;
      name: string;
      color: string;
      emoji: string | null;
      photoPath: string | null;
      hasCompletedQuiz: boolean;
    };
  }>(res);
}

export async function signOutProfile() {
  const res = await fetch("/api/profiles/select", { method: "DELETE" });
  return json<{ ok: true }>(res);
}

// ------------------------------------------------------------------ clothing

export type ItemFilters = {
  category?: string;
  color?: string;
  tag?: string;
  season?: string;
  search?: string;
};

export async function fetchItems(filters: ItemFilters = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) qs.set(k, v);
  }
  const res = await fetch(`/api/clothing?${qs}`, { cache: "no-store" });
  return (await json<{ items: ClientItem[] }>(res)).items;
}

export type ClassifiedItem = {
  name: string;
  category: string;
  /** Null when the model's guess didn't match a real dropdown option. */
  type: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  styleTags: string[];
  season: string;
};

/**
 * Ask the photo what it is. Returns `null` both when nothing useful came
 * back and when no API key is configured — callers don't need to tell those
 * apart, since either way the form just stays blank for the person to fill in.
 */
export async function classifyItemPhoto(
  photo: File
): Promise<ClassifiedItem | null> {
  const fd = new FormData();
  fd.set("photo", photo);
  const res = await fetch("/api/claude/classify-item", {
    method: "POST",
    body: fd,
  });
  const data = await json<{ available: boolean; suggestion: ClassifiedItem | null }>(
    res
  );
  return data.available ? data.suggestion : null;
}

export type ScanMatch = {
  score: number;
  items: { slot: string; item: ClientItem }[];
};

export type ScanResult = {
  item: ClassifiedItem;
  bestScore: number | null;
  matches: ScanMatch[];
  verdict: string;
  verdictSource: "claude" | "local";
};

/** Scan an item seen out in the world — nothing is saved, just scored. */
export async function scanItem(photo: File): Promise<ScanResult> {
  const fd = new FormData();
  fd.set("photo", photo);
  const res = await fetch("/api/scan", { method: "POST", body: fd });
  return json<ScanResult>(res);
}

export async function createItem(form: FormData) {
  const res = await fetch("/api/clothing", { method: "POST", body: form });
  return (await json<{ item: ClientItem }>(res)).item;
}

export async function updateItem(id: number, form: FormData) {
  const res = await fetch(`/api/clothing/${id}`, { method: "PUT", body: form });
  return (await json<{ item: ClientItem }>(res)).item;
}

export async function deleteItem(id: number) {
  const res = await fetch(`/api/clothing/${id}`, { method: "DELETE" });
  return json<{ ok: true }>(res);
}

export async function markWashed(id: number) {
  const res = await fetch(`/api/clothing/${id}`, { method: "PATCH" });
  return (await json<{ item: ClientItem }>(res)).item;
}

export async function fetchItemHistory(id: number) {
  const res = await fetch(`/api/clothing/${id}/history`, { cache: "no-store" });
  return (
    await json<{
      days: { date: string; outfitId: number | null; outfitName: string | null }[];
    }>(res)
  ).days;
}

// ------------------------------------------------------------------- outfits

export type ScoreBreakdown = {
  color: number;
  style: number;
  season: number;
  preference: number;
  recencyPenalty: number;
  total: number;
  notes: string[];
};

export type Suggestion = {
  name: string;
  score: number;
  breakdown: ScoreBreakdown;
  styleNote: string;
  noteSource: "claude" | "local";
  signature: string;
  items: { slot: string; item: ClientItem }[];
};

export async function generateOutfits(opts: {
  count?: number;
  excludeSignatures?: string[];
  excludeItemIds?: number[];
}) {
  const res = await fetch("/api/outfits/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  return json<{ outfits: Suggestion[]; reason?: string }>(res);
}

export async function saveOutfit(payload: {
  name: string;
  styleNote?: string | null;
  tags?: string[];
  items: { itemId: number; slot: string }[];
  disliked?: boolean;
}) {
  const res = await fetch("/api/outfits/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await json<{ outfit: ClientOutfit }>(res)).outfit;
}

export async function fetchOutfits(sort = "recent", tag?: string) {
  const qs = new URLSearchParams({ sort });
  if (tag) qs.set("tag", tag);
  const res = await fetch(`/api/outfits?${qs}`, { cache: "no-store" });
  return (await json<{ outfits: ClientOutfit[] }>(res)).outfits;
}

export async function updateOutfit(
  id: number,
  patch: { name?: string; tags?: string[]; styleNote?: string | null; disliked?: boolean }
) {
  const res = await fetch(`/api/outfits/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return (await json<{ outfit: ClientOutfit }>(res)).outfit;
}

export async function deleteOutfit(id: number) {
  const res = await fetch(`/api/outfits/${id}`, { method: "DELETE" });
  return json<{ ok: true }>(res);
}

export async function fetchStyleNote(itemIds: number[]) {
  const res = await fetch("/api/claude/style-note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemIds }),
  });
  return json<{ styleNote: string; source: string; breakdown: ScoreBreakdown }>(
    res
  );
}

// ------------------------------------------------------------------ wear log

export type WearDay = {
  date: string;
  outfitId: number | null;
  outfitName: string | null;
  items: ClientItem[];
};

export async function fetchWearLog(from?: string, to?: string) {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const res = await fetch(`/api/wear-log?${qs}`, { cache: "no-store" });
  return (await json<{ days: WearDay[] }>(res)).days;
}

export async function logWear(payload: {
  date: string;
  outfitId?: number | null;
  itemIds?: number[];
}) {
  const res = await fetch("/api/wear-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return json<{ ok: true; date: string }>(res);
}

export async function clearWear(date: string) {
  const res = await fetch(`/api/wear-log?date=${date}`, { method: "DELETE" });
  return json<{ ok: true }>(res);
}

export type Stats = {
  totalOutfitsLogged: number;
  totalItems: number;
  totalSavedOutfits: number;
  streak: number;
  mostWornItem: ClientItem | null;
  leastWornItems: ClientItem[];
  underusedItems: ClientItem[];
  laundryDueItems: ClientItem[];
  favoriteOutfit: ClientOutfit | null;
  colorBreakdown: { color: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  loggedDays: string[];
};

export async function fetchStats() {
  const res = await fetch("/api/wear-log/stats", { cache: "no-store" });
  return json<Stats>(res);
}

// ------------------------------------------------------------------- profile

export async function fetchProfile() {
  const res = await fetch("/api/style-profile", { cache: "no-store" });
  return (await json<{ profile: ClientProfile | null }>(res)).profile;
}

export async function saveProfile(profile: {
  styleVibe: string;
  preferredColors: string[];
  fit: string;
  occasion: string;
  avoidColors: string[];
  mustInclude: string[];
}) {
  const res = await fetch("/api/style-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  return (await json<{ profile: ClientProfile }>(res)).profile;
}

export async function resetProfile() {
  const res = await fetch("/api/style-profile", { method: "DELETE" });
  return json<{ ok: true }>(res);
}

// --------------------------------------------------------------------- today

export type TodayResponse = {
  alreadyLogged?: boolean;
  weather: {
    tempC: number;
    tempF: number;
    code: number;
    label: string;
    precipitationChance: number;
  } | null;
  outfit: {
    name: string;
    outfitId?: number | null;
    score?: number;
    breakdown?: ScoreBreakdown;
    styleNote?: string;
    weatherNote?: string | null;
    signature?: string;
    items: { slot: string; item: ClientItem }[];
  } | null;
  reason?: string;
};

export async function fetchToday(coords?: { lat: number; lon: number }) {
  const qs = new URLSearchParams();
  if (coords) {
    qs.set("lat", String(coords.lat));
    qs.set("lon", String(coords.lon));
  }
  const res = await fetch(`/api/today?${qs}`, { cache: "no-store" });
  return json<TodayResponse>(res);
}
