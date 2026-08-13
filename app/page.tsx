"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import OutfitTiles from "@/components/OutfitTiles";
import UnderusedAlert from "@/components/UnderusedAlert";
import LaundryAlert from "@/components/LaundryAlert";
import {
  ItemThumb,
  ScoreBadge,
  Spinner,
  relativeDay,
  wearCount,
} from "@/components/ui";
import {
  CalendarIcon,
  CheckIcon,
  FlameIcon,
  HangerIcon,
  PlusIcon,
  SparkIcon,
  SunIcon,
} from "@/components/Icons";
import { useToast } from "@/components/Toast";
import {
  fetchStats,
  fetchToday,
  logWear,
  saveOutfit,
  type Stats,
  type TodayResponse,
} from "@/lib/api";
import { LOADING_MESSAGES } from "@/lib/constants";
import { dateKey } from "@/lib/serialize";

const COORDS_KEY = "fitcheck.coords";

export default function HomePage() {
  const toast = useToast();
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setMessage(
        LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
      );
    }, 1400);
    return () => window.clearInterval(id);
  }, [loading]);

  /**
   * Weather needs coordinates. We ask once, cache the answer, and fall back to
   * a weather-less suggestion if permission is denied — never blocking.
   */
  const getCoords = useCallback((): Promise<
    { lat: number; lon: number } | undefined
  > => {
    const cached = localStorage.getItem(COORDS_KEY);
    if (cached) {
      try {
        return Promise.resolve(JSON.parse(cached));
      } catch {
        /* fall through to a fresh lookup */
      }
    }
    if (!("geolocation" in navigator)) return Promise.resolve(undefined);

    return new Promise((resolve) => {
      const timer = window.setTimeout(() => resolve(undefined), 6000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(timer);
          const coords = {
            lat: Number(pos.coords.latitude.toFixed(2)),
            lon: Number(pos.coords.longitude.toFixed(2)),
          };
          localStorage.setItem(COORDS_KEY, JSON.stringify(coords));
          resolve(coords);
        },
        () => {
          window.clearTimeout(timer);
          resolve(undefined);
        },
        { timeout: 5500, maximumAge: 30 * 60 * 1000 }
      );
    });
  }, []);

  async function suggest() {
    setLoading(true);
    try {
      const coords = await getCoords();
      setToday(await fetchToday(coords));
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function logSuggestion() {
    if (!today?.outfit) return;
    setLogging(true);
    try {
      const outfit = await saveOutfit({
        name: today.outfit.name,
        styleNote: today.outfit.styleNote,
        items: today.outfit.items.map((i) => ({
          itemId: i.item.id,
          slot: i.slot,
        })),
      });
      await logWear({ date: dateKey(new Date()), outfitId: outfit.id });
      toast("Logged for today");
      const [t, s] = await Promise.all([fetchToday(), fetchStats()]);
      setToday(t);
      setStats(s);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setLogging(false);
    }
  }

  const empty = stats !== null && stats.totalItems === 0;

  return (
    <div className="space-y-6 py-2">
      {/* ------------------------------------------------------------ hero */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #c9a25a 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #c98a9c 0%, transparent 70%)",
          }}
        />
        {/* The signature moment: a slow band of light drifting across the
            hero, like a hand smoothing silk. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-[-40%] left-1/2 w-1/2 -translate-x-1/2 animate-sheen opacity-[0.1]"
          style={{
            background:
              "linear-gradient(100deg, transparent 35%, #f3ece2 50%, transparent 65%)",
          }}
        />
        <div className="relative">
          <h1 className="font-serif text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
            <span className="italic text-accent-soft">{greeting()}.</span>{" "}
            {empty ? "Let's fill your closet" : "What should I wear today?"}
          </h1>
          <p className="mt-2 max-w-md text-sm text-[#a99bb5]">
            {empty
              ? "Add a few photos of what you own and the app will start building outfits from your real clothes."
              : "One tap and we'll pick the best fit from your wardrobe — weather and recent wears included."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {empty ? (
              <Link href="/wardrobe" className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Add your first item
              </Link>
            ) : (
              <>
                <button
                  className="btn-primary"
                  onClick={suggest}
                  disabled={loading}
                >
                  <SparkIcon className="h-4 w-4" />
                  {loading ? message : "Pick my fit"}
                </button>
                <Link href="/outfits" className="btn-ghost">
                  Browse more options
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- today's outfit */}
      {loading && (
        <div className="card grid place-items-center gap-3 py-14">
          <Spinner className="h-7 w-7" />
          <p className="text-sm text-[#a99bb5]">{message}</p>
        </div>
      )}

      {!loading && today && (
        <section className="card animate-fade-up overflow-hidden">
          {today.weather && (
            <div className="flex items-center gap-2 border-b border-ink-700 px-4 py-2.5 text-xs text-[#a99bb5]">
              <SunIcon className="h-4 w-4 text-accent" />
              <span className="font-medium text-white">
                {today.weather.tempC}°C / {today.weather.tempF}°F
              </span>
              <span>· {today.weather.label}</span>
              {today.weather.precipitationChance >= 40 && (
                <span>· {today.weather.precipitationChance}% rain</span>
              )}
            </div>
          )}

          {today.outfit ? (
            <>
              <OutfitTiles
                items={today.outfit.items}
                className="aspect-[16/9] w-full"
              />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-medium">
                      {today.alreadyLogged
                        ? "You're wearing this today"
                        : today.outfit.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#a99bb5]">
                      {today.outfit.items.map((i) => i.item.name).join(" · ")}
                    </p>
                  </div>
                  {today.outfit.score != null && (
                    <ScoreBadge score={today.outfit.score} />
                  )}
                </div>

                {today.outfit.weatherNote && (
                  <p className="inline-flex rounded-lg bg-accent/10 px-2.5 py-1 text-xs text-accent-soft">
                    {today.outfit.weatherNote}
                  </p>
                )}

                {today.outfit.styleNote && (
                  <p className="rounded-xl bg-ink-850 p-3.5 text-[13px] leading-relaxed text-[#d6cddc]">
                    {today.outfit.styleNote}
                  </p>
                )}

                {today.alreadyLogged ? (
                  <p className="flex items-center gap-1.5 text-sm text-emerald-400">
                    <CheckIcon className="h-4 w-4" />
                    Logged for today
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-primary"
                      onClick={logSuggestion}
                      disabled={logging}
                    >
                      {logging ? "Logging..." : "I'm wearing this"}
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={suggest}
                      disabled={loading}
                    >
                      Show me another
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="p-6 text-sm text-[#a99bb5]">
              {today.reason ?? "Nothing to suggest yet."}
            </p>
          )}
        </section>
      )}

      <UnderusedAlert items={stats?.underusedItems ?? []} />
      <LaundryAlert
        items={stats?.laundryDueItems ?? []}
        onWashed={() => fetchStats().then(setStats).catch(() => {})}
      />

      {/* ----------------------------------------------------- stat strip */}
      {stats && stats.totalItems > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={<FlameIcon className="h-5 w-5" />}
            value={stats.streak}
            label="day streak"
            href="/calendar"
          />
          <StatTile
            icon={<CalendarIcon className="h-5 w-5" />}
            value={stats.totalOutfitsLogged}
            label="days logged"
            href="/calendar"
          />
          <StatTile
            icon={<HangerIcon className="h-5 w-5" />}
            value={stats.totalItems}
            label="items owned"
            href="/wardrobe"
          />
          <StatTile
            icon={<SparkIcon className="h-5 w-5" />}
            value={stats.totalSavedOutfits}
            label="saved fits"
            href="/saved-outfits"
          />
        </section>
      )}

      {/* -------------------------------------------------- most worn item */}
      {stats?.mostWornItem && (
        <section className="card flex items-center gap-4 p-4">
          <ItemThumb
            item={stats.mostWornItem}
            className="h-16 w-16 shrink-0 rounded-xl"
            sizes="64px"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a99bb5]">
              Your most worn piece
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {stats.mostWornItem.name}
            </p>
            <p className="text-xs text-[#a99bb5]">
              {wearCount(stats.mostWornItem.timesWorn)} ·{" "}
              {relativeDay(stats.mostWornItem.lastWornDate)}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  href,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card flex flex-col gap-1.5 p-4 transition hover:border-ink-600 hover:bg-ink-750"
    >
      <span className="text-accent">{icon}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-[11px] text-[#a99bb5]">{label}</span>
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
