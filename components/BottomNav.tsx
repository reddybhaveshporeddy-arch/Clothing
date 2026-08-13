"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarkIcon,
  CalendarIcon,
  HangerIcon,
  HomeIcon,
  SparkIcon,
} from "./Icons";

const LINKS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/wardrobe", label: "Wardrobe", Icon: HangerIcon },
  { href: "/outfits", label: "Outfits", Icon: SparkIcon },
  { href: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { href: "/saved-outfits", label: "Saved", Icon: BookmarkIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/onboarding") || pathname?.startsWith("/profiles")) {
    return null;
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-700 bg-ink-850/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {LINKS.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-accent" : "text-[#9686a1] hover:text-white"
                }`}
              >
                <Icon className="h-[22px] w-[22px]" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
