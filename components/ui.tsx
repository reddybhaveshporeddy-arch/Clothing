"use client";

import Image from "next/image";
import { colorToHex, contrastText } from "@/lib/colors";
import type { ClientItem } from "@/lib/api";
import { ImageIcon } from "./Icons";

export function ColorDot({
  color,
  size = 14,
  title,
}: {
  color: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      title={title ?? color}
      aria-label={title ?? color}
      className="inline-block shrink-0 rounded-full ring-1 ring-white/15"
      style={{
        width: size,
        height: size,
        backgroundColor: colorToHex(color),
      }}
    />
  );
}

/** A profile's tile: its uploaded photo when set, otherwise emoji-on-color. */
export function ProfileAvatar({
  profile,
  className = "",
}: {
  profile: {
    name: string;
    color: string;
    emoji: string | null;
    photoPath?: string | null;
  };
  className?: string;
}) {
  if (profile.photoPath) {
    return (
      <span className={`relative block overflow-hidden ${className}`}>
        <Image
          src={profile.photoPath}
          alt={profile.name}
          fill
          sizes="120px"
          className="object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className={`grid place-items-center ${className}`}
      style={{
        backgroundColor: profile.color,
        color: contrastText(profile.color),
      }}
    >
      {profile.emoji || profile.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function ScoreBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md";
}) {
  const tone =
    score >= 80
      ? "text-emerald-300 border-emerald-700/60 bg-emerald-950/50"
      : score >= 60
      ? "text-accent-soft border-accent/40 bg-accent/10"
      : "text-amber-300 border-amber-800/60 bg-amber-950/40";

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-semibold tabular-nums ${tone} ${
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      }`}
    >
      {Math.round(score)}%
    </span>
  );
}

export function ItemThumb({
  item,
  className = "",
  sizes = "120px",
  priority = false,
}: {
  item: Pick<ClientItem, "photoPath" | "name">;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!item.photoPath) {
    return (
      <div
        className={`grid place-items-center bg-ink-750 text-[#6f5f7c] ${className}`}
      >
        <ImageIcon className="h-6 w-6" />
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden bg-ink-750 ring-1 ring-inset ring-white/[0.06] ${className}`}
    >
      <Image
        src={item.photoPath}
        alt={item.name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 grid h-20 w-20 place-items-center rounded-2xl border border-ink-600 bg-ink-750">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10 text-[#6f5f7c]"
          aria-hidden
        >
          <path d="M24 13a3.5 3.5 0 1 1 3.5-3.5c0 1.9-1.3 2.8-3.5 3.5v3.5" />
          <path d="M24 16.5 8 28c-1.7 1.2-.8 3.7 1.4 3.7h29.2c2.2 0 3.1-2.5 1.4-3.7L24 16.5Z" />
          <path d="M14 38h20" opacity=".45" />
        </svg>
      </div>
      <h3 className="font-serif text-base font-medium">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[#a99bb5]">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-ink-600 border-t-accent ${
        className || "h-5 w-5"
      }`}
    />
  );
}

export function SectionHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-xl font-medium tracking-tight sm:text-2xl">
          {title}
        </h1>
        <span className="divider-gold mt-2 block w-9" aria-hidden />
        {subtitle && (
          <p className="mt-2 text-sm text-[#a99bb5]">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

/** "1 wear" / "4 wears" — singular counts read wrong otherwise. */
export function wearCount(n: number): string {
  return `${n} ${n === 1 ? "wear" : "wears"}`;
}

/** "3 days ago" / "Today" — used on wear badges throughout the app. */
export function relativeDay(iso: string | null): string {
  if (!iso) return "Never worn";
  const then = new Date(iso);
  const now = new Date();
  const a = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 60) return "Last month";
  return `${Math.floor(days / 30)} months ago`;
}
