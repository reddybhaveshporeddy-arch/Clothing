"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useActiveProfile } from "./ProfileGate";
import { ProfileAvatar } from "./ui";
import { signOutProfile } from "@/lib/api";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/outfits", label: "Outfits" },
  { href: "/scan", label: "Scan" },
  { href: "/calendar", label: "Calendar" },
  { href: "/saved-outfits", label: "Saved" },
];

export default function TopBar() {
  const pathname = usePathname();
  if (pathname?.startsWith("/onboarding") || pathname?.startsWith("/profiles")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-900/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-b from-accent-soft to-accent text-sm font-semibold text-ink-900 shadow-glow">
            F
          </span>
          <span className="hidden font-serif text-[17px] italic tracking-tight sm:inline">
            Fit Check
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-ink-750 text-white"
                    : "text-[#a99bb5] hover:bg-ink-800 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <ProfileMenu />
      </div>
    </header>
  );
}

function ProfileMenu() {
  const { profile } = useActiveProfile();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!profile) {
    return (
      <Link href="/profiles" className="btn-subtle text-xs">
        Pick a profile
      </Link>
    );
  }

  async function switchProfile() {
    await signOutProfile().catch(() => {});
    router.push("/profiles");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-ink-800"
      >
        <ProfileAvatar
          profile={profile}
          className="h-7 w-7 rounded-lg text-sm"
        />
        <span className="max-w-24 truncate text-xs font-medium text-[#cabfd2]">
          {profile.name}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-ink-700 bg-ink-850 shadow-2xl"
        >
          <div className="border-b border-ink-700 px-3.5 py-2.5">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="mt-0.5 text-[11px] text-[#9686a1]">
              This device is using this profile
            </p>
          </div>
          <Link
            href={`/profiles?edit=${profile.id}`}
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm text-[#cabfd2] transition hover:bg-ink-750 hover:text-white"
          >
            Edit name, photo &amp; color
          </Link>
          <Link
            href="/onboarding?edit=1"
            onClick={() => setOpen(false)}
            className="block px-3.5 py-2.5 text-sm text-[#cabfd2] transition hover:bg-ink-750 hover:text-white"
          >
            Style profile
          </Link>
          <button
            type="button"
            onClick={switchProfile}
            className="block w-full px-3.5 py-2.5 text-left text-sm text-[#cabfd2] transition hover:bg-ink-750 hover:text-white"
          >
            Switch profile
          </button>
        </div>
      )}
    </div>
  );
}
