"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export type ActiveProfile = {
  id: number;
  name: string;
  color: string;
  emoji: string | null;
  photoPath: string | null;
} | null;

const ActiveProfileContext = createContext<{
  profile: ActiveProfile;
  refresh: () => void;
}>({ profile: null, refresh: () => {} });

export function useActiveProfile() {
  return useContext(ActiveProfileContext);
}

/** Pages that are reachable without having picked a profile. */
const OPEN_ROUTES = ["/profiles"];

/**
 * Decides where a visitor lands:
 *   no profiles at all      → /profiles (which opens "create your profile")
 *   profile not picked here → /profiles (the "who's using this?" screen)
 *   picked but no quiz yet  → /onboarding
 *   otherwise               → through to the app
 *
 * The choice lives in a cookie, so each device picks independently — your
 * phone and your laptop can be on different profiles at once.
 */
export default function ProfileGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<ActiveProfile>(null);
  const [ready, setReady] = useState(false);

  const isOpenRoute = OPEN_ROUTES.some((r) => pathname?.startsWith(r));
  const isOnboarding = pathname?.startsWith("/onboarding");

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles", { cache: "no-store" });
      const data = await res.json();

      const active = data.profiles.find(
        (p: { id: number }) => p.id === data.activeProfileId
      );

      if (!active) {
        setProfile(null);
        if (!isOpenRoute) {
          router.replace("/profiles");
          return;
        }
        setReady(true);
        return;
      }

      setProfile({
        id: active.id,
        name: active.name,
        color: active.color,
        emoji: active.emoji,
        photoPath: active.photoPath,
      });

      if (!active.hasCompletedQuiz && !isOnboarding && !isOpenRoute) {
        router.replace("/onboarding");
        return;
      }
      setReady(true);
    } catch {
      // Don't trap the user behind a blank screen if the check itself fails.
      setReady(true);
    }
  }, [router, isOpenRoute, isOnboarding]);

  useEffect(() => {
    setReady(false);
    check();
  }, [check, pathname]);

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-accent" />
      </div>
    );
  }

  return (
    <ActiveProfileContext.Provider value={{ profile, refresh: check }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}
