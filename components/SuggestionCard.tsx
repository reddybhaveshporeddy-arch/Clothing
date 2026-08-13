"use client";

import { useState } from "react";
import OutfitTiles from "./OutfitTiles";
import ScoreBar from "./ScoreBar";
import { ScoreBadge } from "./ui";
import {
  BookmarkIcon,
  CheckIcon,
  RefreshIcon,
  ThumbDownIcon,
} from "./Icons";
import type { Suggestion } from "@/lib/api";

export default function SuggestionCard({
  suggestion,
  onSave,
  onWear,
  onRegenerate,
  onDislike,
  saved,
  worn,
  busy,
}: {
  suggestion: Suggestion;
  onSave: () => void;
  onWear: () => void;
  onRegenerate: () => void;
  onDislike: () => void;
  saved: boolean;
  worn: boolean;
  busy: boolean;
}) {
  const [regenerating, setRegenerating] = useState(false);

  async function regenerate() {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <article className="card animate-fade-up overflow-hidden">
      <OutfitTiles items={suggestion.items} className="aspect-[4/3] w-full" />

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-[16px] font-medium">
              {suggestion.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-[#a99bb5]">
              {suggestion.items.map((i) => i.item.name).join(" · ")}
            </p>
          </div>
          <ScoreBadge score={suggestion.score} />
        </div>

        {suggestion.styleNote && (
          <p className="rounded-xl bg-ink-850 p-3 text-[13px] leading-relaxed text-[#d6cddc]">
            {suggestion.styleNote}
          </p>
        )}

        <ScoreBar breakdown={suggestion.breakdown} />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            className="btn-primary"
            onClick={onWear}
            disabled={busy || worn}
          >
            {worn ? (
              <>
                <CheckIcon className="h-4 w-4" />
                Logged today
              </>
            ) : (
              "Log as worn today"
            )}
          </button>
          <button
            className="btn-ghost"
            onClick={onSave}
            disabled={busy || saved}
          >
            <BookmarkIcon className="h-4 w-4" />
            {saved ? "Saved" : "Save outfit"}
          </button>
          <button
            className="btn-subtle"
            onClick={regenerate}
            disabled={busy || regenerating}
          >
            <RefreshIcon
              className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
            />
            Regenerate
          </button>
          <button className="btn-subtle" onClick={onDislike} disabled={busy}>
            <ThumbDownIcon className="h-4 w-4" />
            Dislike
          </button>
        </div>
      </div>
    </article>
  );
}
