"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchProfile, saveProfile } from "@/lib/api";
import {
  FITS,
  OCCASIONS,
  QUIZ_COLORS,
  STYLE_VIBES,
  TYPES_BY_CATEGORY,
} from "@/lib/constants";
import { useActiveProfile } from "@/components/ProfileGate";
import { useToast } from "@/components/Toast";
import { CheckIcon } from "@/components/Icons";

type Answers = {
  styleVibe: string;
  preferredColors: string[];
  fit: string;
  occasion: string;
  avoidColors: string[];
  mustInclude: string[];
};

const EMPTY: Answers = {
  styleVibe: "",
  preferredColors: [],
  fit: "",
  occasion: "",
  avoidColors: [],
  mustInclude: [],
};

const ALWAYS_INCLUDE_OPTIONS = [
  ...TYPES_BY_CATEGORY.top,
  ...TYPES_BY_CATEGORY.outerwear,
];

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { refresh } = useActiveProfile();
  const isEdit = params.get("edit") === "1";

  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    fetchProfile()
      .then((p) => {
        if (p) setAnswers({ ...EMPTY, ...p });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isEdit]);

  const steps = [
    {
      key: "styleVibe",
      title: "What's your style vibe?",
      subtitle: "Pick the one that sounds most like you.",
      render: () => (
        <OptionGrid
          options={STYLE_VIBES.map((v) => ({ value: v.value, label: v.label }))}
          selected={[answers.styleVibe]}
          onSelect={(v) => set({ styleVibe: v })}
        />
      ),
      valid: () => Boolean(answers.styleVibe),
    },
    {
      key: "preferredColors",
      title: "What colors do you wear most?",
      subtitle: "Pick as many as you like.",
      render: () => (
        <OptionGrid
          multi
          options={QUIZ_COLORS}
          selected={answers.preferredColors}
          onSelect={(v) => toggle("preferredColors", v)}
        />
      ),
      valid: () => answers.preferredColors.length > 0,
    },
    {
      key: "fit",
      title: "Baggy or fitted?",
      subtitle: "How you like your clothes to sit.",
      render: () => (
        <OptionGrid
          options={FITS.map((f) => ({ value: f.value, label: f.label }))}
          selected={[answers.fit]}
          onSelect={(v) => set({ fit: v })}
        />
      ),
      valid: () => Boolean(answers.fit),
    },
    {
      key: "occasion",
      title: "Where are you wearing these fits?",
      subtitle: "Your typical day.",
      render: () => (
        <OptionGrid
          options={OCCASIONS.map((o) => ({ value: o.value, label: o.label }))}
          selected={[answers.occasion]}
          onSelect={(v) => set({ occasion: v })}
        />
      ),
      valid: () => Boolean(answers.occasion),
    },
    {
      key: "avoidColors",
      title: "Any colors you never wear?",
      subtitle: "We'll keep these out of your suggestions. Skip if there aren't any.",
      render: () => (
        <OptionGrid
          multi
          options={QUIZ_COLORS}
          selected={answers.avoidColors}
          onSelect={(v) => toggle("avoidColors", v)}
        />
      ),
      valid: () => true,
    },
    {
      key: "mustInclude",
      title: "Anything you always want in your outfits?",
      subtitle: "Optional — we'll favour these when building fits.",
      render: () => (
        <OptionGrid
          multi
          options={ALWAYS_INCLUDE_OPTIONS.map((t) => ({ value: t, label: t }))}
          selected={answers.mustInclude}
          onSelect={(v) => toggle("mustInclude", v)}
        />
      ),
      valid: () => true,
    },
  ];

  function set(patch: Partial<Answers>) {
    setAnswers((a) => ({ ...a, ...patch }));
  }

  function toggle(key: "preferredColors" | "avoidColors" | "mustInclude", value: string) {
    setAnswers((a) => {
      const list = a[key];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];

      // A color can't be both loved and avoided — drop it from the other list.
      if (key === "preferredColors") {
        return { ...a, preferredColors: next, avoidColors: a.avoidColors.filter((c) => c !== value) };
      }
      if (key === "avoidColors") {
        return { ...a, avoidColors: next, preferredColors: a.preferredColors.filter((c) => c !== value) };
      }
      return { ...a, [key]: next };
    });
  }

  async function finish() {
    setSaving(true);
    try {
      await saveProfile(answers);
      // The gate reads quiz completion from the server, so refresh it before
      // navigating or it will bounce us straight back here.
      refresh();
      toast(isEdit ? "Style profile updated" : "You're all set");
      router.push(isEdit ? "/" : "/wardrobe");
    } catch (err) {
      toast((err as Error).message, "error");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-accent" />
      </div>
    );
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-8 sm:py-14">
      <div className="mb-10">
        <div className="h-1 overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-right text-[11px] text-[#83718e]">
          {step + 1} of {steps.length}
        </p>
      </div>

      <div key={current.key} className="animate-fade-up flex-1">
        <h1 className="font-serif text-2xl font-medium tracking-tight sm:text-3xl">
          {current.title}
        </h1>
        <p className="mt-2 text-sm text-[#a99bb5]">{current.subtitle}</p>
        <div className="mt-7">{current.render()}</div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn-subtle"
          onClick={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>

        <button
          type="button"
          className="btn-primary min-w-32"
          disabled={!current.valid() || saving}
          onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
        >
          {saving ? "Saving..." : isLast ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  onSelect,
  multi = false,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}) {
  return (
    <div
      role={multi ? "group" : "radiogroup"}
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
    >
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={active}
            onClick={() => onSelect(o.value)}
            className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-all active:scale-[0.98] ${
              active
                ? "border-accent bg-accent/12 text-white"
                : "border-ink-600 bg-ink-800 text-[#cabfd2] hover:border-ink-500 hover:text-white"
            }`}
          >
            <span>{o.label}</span>
            {active && <CheckIcon className="h-4 w-4 shrink-0 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}
