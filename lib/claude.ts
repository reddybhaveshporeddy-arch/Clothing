import Anthropic from "@anthropic-ai/sdk";
import type { EngineItem, EngineProfile, ScoreBreakdown } from "./matching";
import { localStyleNote } from "./matching";
import {
  CATEGORIES,
  SEASONS,
  STYLE_TAGS,
  TYPES_BY_CATEGORY,
  type Category,
} from "./constants";

const MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!client) {
    client = new Anthropic({
      apiKey: key,
      // The SDK's bundled node-fetch mishandles gzip'd responses on this
      // Node version — decompression dies mid-stream with "Premature close"
      // on anything past a small plain-text reply (confirmed: fails calling
      // the SDK directly outside Next.js too, so it isn't framework-related).
      // Node's own fetch doesn't have the bug, so use that instead.
      fetch: globalThis.fetch,
    });
  }
  return client;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function describe(items: EngineItem[]): string {
  return items
    .map((i) => {
      const secondary = i.secondaryColor ? ` / ${i.secondaryColor}` : "";
      const tags = i.styleTags?.length ? ` [${i.styleTags.join(", ")}]` : "";
      const notes = i.notes ? ` (${i.notes})` : "";
      return `- ${i.category}: ${i.name} — ${i.primaryColor}${secondary} ${i.type}${tags}${notes}`;
    })
    .join("\n");
}

/**
 * Ask Claude for a short style note. Any failure — no key, rate limit, network
 * — falls back to the local note writer so outfit generation never breaks.
 */
export async function styleNote(
  items: EngineItem[],
  profile: EngineProfile,
  breakdown: ScoreBreakdown
): Promise<{ note: string; source: "claude" | "local" }> {
  const anthropic = getClient();
  if (!anthropic) {
    return { note: localStyleNote(items, breakdown), source: "local" };
  }

  const vibe = profile?.styleVibe ?? "casual";
  const fit = profile?.fit ?? "mixed";

  const prompt = `The user is an 8th grade male who prefers a ${vibe} style and ${fit} fits.

They have this outfit:
${describe(items)}

In 1-2 casual, friendly sentences explain why this outfit works and give one styling tip. Talk directly to them, no greeting, no bullet points, no emoji. Keep it under 45 words.`;

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    if (!text) throw new Error("empty response");
    return { note: text, source: "claude" };
  } catch (err) {
    console.error("[claude] style note failed, using local fallback:", err);
    return { note: localStyleNote(items, breakdown), source: "local" };
  }
}

export type ClassifiedItem = {
  name: string;
  category: Category;
  type: string;
  primaryColor: string;
  secondaryColor: string | null;
  styleTags: string[];
  season: string;
};

const CLASSIFY_SCHEMA = {
  type: "object" as const,
  properties: {
    name: {
      type: "string",
      description:
        "Short descriptive name, e.g. 'Black Hoodie' or 'Navy Quarter-Zip'. Never guess a brand.",
    },
    category: { type: "string", enum: CATEGORIES },
    type: {
      type: "string",
      description: "The closest matching type for the chosen category.",
    },
    primaryColor: { type: "string" },
    secondaryColor: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    styleTags: {
      // "Complex array constraints" like maxItems aren't supported by
      // structured outputs — the count limit is a prompt instruction instead,
      // enforced with a client-side slice as a backstop.
      type: "array",
      items: { type: "string", enum: STYLE_TAGS },
    },
    season: { type: "string", enum: SEASONS },
  },
  required: [
    "name",
    "category",
    "type",
    "primaryColor",
    "secondaryColor",
    "styleTags",
    "season",
  ],
  additionalProperties: false as const,
};

/**
 * Look at a clothing photo and guess its name, category, type, color, style
 * tags and season, so the add-item form arrives pre-filled instead of blank.
 *
 * Returns null on any failure — no API key, a network error, a response that
 * doesn't parse — because there is no local fallback for "what color is
 * this": unlike the style note, this either comes from the model or it
 * doesn't happen, and the caller falls back to a blank form either way.
 */
export async function classifyClothingItem(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ClassifiedItem | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const typesBlock = CATEGORIES.map(
    (c) => `- ${c}: ${TYPES_BY_CATEGORY[c].join(", ")}`
  ).join("\n");

  const prompt = `This photo shows a single piece of clothing, likely on a plain background or laid flat. Identify it for a teenager's wardrobe app.

Valid types per category:
${typesBlock}

Valid style tags: ${STYLE_TAGS.join(", ")} (pick 1-3, whichever genuinely fit)
Valid seasons: ${SEASONS.join(", ")} ("all" if it works year-round)

Pick exactly one category, then a type from that category's list. If nothing fits well, choose the closest one. secondaryColor should be null unless a second color is genuinely notable (not just stitching or a small logo).`;

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      // @ts-expect-error — output_config.format isn't in this SDK version's
      // types yet, but the API accepts it; see the structured-outputs docs.
      output_config: { format: { type: "json_schema", schema: CLASSIFY_SCHEMA } },
    });

    const block = res.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    if (!block) return null;

    const parsed = JSON.parse(block.text);
    if (!CATEGORIES.includes(parsed.category)) return null;

    return {
      name: String(parsed.name || "").slice(0, 80),
      category: parsed.category,
      type: String(parsed.type || ""),
      primaryColor: String(parsed.primaryColor || "").slice(0, 40),
      secondaryColor: parsed.secondaryColor
        ? String(parsed.secondaryColor).slice(0, 40)
        : null,
      styleTags: Array.isArray(parsed.styleTags)
        ? parsed.styleTags
            .filter((t: unknown) =>
              (STYLE_TAGS as readonly string[]).includes(String(t))
            )
            .slice(0, 3)
        : [],
      season: SEASONS.includes(parsed.season) ? parsed.season : "all",
    };
  } catch (err) {
    console.error("[claude] item classification failed:", err);
    return null;
  }
}

