export const CATEGORIES = [
  "top",
  "bottom",
  "outerwear",
  "shoes",
  "accessory",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  top: "Top",
  bottom: "Bottom",
  outerwear: "Outerwear",
  shoes: "Shoes",
  accessory: "Accessory",
};

/** Types available per category. Categories without a fixed list accept free text. */
export const TYPES_BY_CATEGORY: Record<Category, string[]> = {
  top: [
    "Graphic Tee",
    "Hoodie",
    "Crewneck",
    "Long Sleeve",
    "Flannel",
    "Quarter-Zip",
    "Polo",
    "Tank",
  ],
  bottom: [
    "Baggy Jeans",
    "Slim Jeans",
    "Cargo Pants",
    "Joggers",
    "Shorts",
    "Chinos",
  ],
  outerwear: ["Jacket", "Puffer", "Windbreaker"],
  shoes: ["Sneakers", "High Tops", "Skate Shoes", "Runners", "Boots", "Slides"],
  accessory: ["Hat", "Beanie", "Chain", "Watch", "Belt", "Backpack", "Socks"],
};

export const STYLE_TAGS = [
  "Casual",
  "Streetwear",
  "Preppy",
  "Athletic",
  "Vintage",
] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

export const SEASONS = ["all", "summer", "fall-winter", "spring"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS: Record<Season, string> = {
  all: "All Year",
  summer: "Summer",
  "fall-winter": "Fall/Winter",
  spring: "Spring",
};

export const STYLE_VIBES = [
  { value: "streetwear", label: "Streetwear" },
  { value: "casual", label: "Casual" },
  { value: "preppy", label: "Preppy" },
  { value: "mixed", label: "Mixed" },
] as const;

export const FITS = [
  { value: "baggy", label: "Baggy" },
  { value: "fitted", label: "Fitted" },
  { value: "mixed", label: "A bit of both" },
] as const;

export const OCCASIONS = [
  { value: "school", label: "School" },
  { value: "hangout", label: "Hanging out" },
  { value: "both", label: "Both" },
] as const;

/** Color options offered in the quiz and the color picker presets. */
export const COLOR_OPTIONS = [
  { name: "black", hex: "#111111" },
  { name: "white", hex: "#f5f5f5" },
  { name: "grey", hex: "#8a8a8a" },
  { name: "navy", hex: "#1f2b47" },
  { name: "brown", hex: "#6b4a2f" },
  { name: "beige", hex: "#d9c7a7" },
  { name: "olive", hex: "#5c6444" },
  { name: "cream", hex: "#efe6d2" },
  { name: "red", hex: "#c0392b" },
  { name: "blue", hex: "#2f6fd0" },
  { name: "green", hex: "#2e8b57" },
  { name: "yellow", hex: "#e5b833" },
  { name: "orange", hex: "#e2761b" },
  { name: "purple", hex: "#6b4ba3" },
  { name: "pink", hex: "#d977a0" },
];

/** Quiz-level color groups (some map to several concrete colors). */
export const QUIZ_COLORS = [
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "grey", label: "Grey" },
  { value: "navy", label: "Navy" },
  { value: "brown", label: "Brown" },
  { value: "earth", label: "Earth tones" },
  { value: "bright", label: "Bright colors" },
];

/** Avatar options for profiles — jewel tones, deliberately distinct at a glance. */
export const PROFILE_COLORS = [
  "#c9a25a", // brass
  "#7e5cad", // amethyst
  "#3f7d6b", // emerald
  "#c98a9c", // dusty rose
  "#8a3b4f", // wine
  "#4a6f8a", // sapphire dusk
  "#a8763e", // bronze
  "#5c7a5e", // sage
];

export const PROFILE_EMOJI = [
  "👕",
  "🧢",
  "👟",
  "🧥",
  "👖",
  "🕶️",
  "🎧",
  "⚡",
  "🔥",
  "🌙",
];

export const LOADING_MESSAGES = [
  "Checking your drip...",
  "Analyzing the fits...",
  "Building your look...",
  "Matching colors...",
  "Digging through the closet...",
];

/** Wears before a piece is nudged as "due for a wash" — categories that sit
 * against skin get flagged sooner than ones that mostly don't. */
export const WASH_THRESHOLD_BY_CATEGORY: Record<Category, number> = {
  top: 2,
  bottom: 3,
  outerwear: 6,
  shoes: 10,
  accessory: 10,
};

export const OUTFIT_NAME_ADJECTIVES = [
  "Clean",
  "Easy",
  "Layered",
  "Low-Key",
  "Sharp",
  "Comfy",
  "Fresh",
  "Everyday",
];
