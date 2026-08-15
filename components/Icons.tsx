import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const HangerIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 7a2 2 0 1 1 2-2c0 1-.7 1.5-2 2v2" />
    <path d="M12 9 4 15c-.9.7-.4 2 .8 2h14.4c1.2 0 1.7-1.3.8-2L12 9Z" />
  </svg>
);

export const SparkIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
    <path d="M18.5 4v3M20 5.5h-3" />
  </svg>
);

export const CalendarIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const BookmarkIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 4.5h12v16l-6-4-6 4v-16Z" />
  </svg>
);

export const HomeIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 10.5 12 4l8 6.5" />
    <path d="M6 10v10h12V10" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const SearchIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

export const RefreshIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 11a8 8 0 1 0-.6 4" />
    <path d="M20 5v6h-6" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const ThumbDownIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 4h9.5l2 8H14l1 5.5a2 2 0 0 1-3.7 1L7 12V4Z" />
    <path d="M7 4H4.5v8H7" />
  </svg>
);

export const FlameIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3s5 4 5 8.5a5 5 0 1 1-10 0C7 9 9 7.5 9 7.5s.5 2.5 2 2.5c1.4 0 1-4 1-7Z" />
  </svg>
);

export const ChevronLeftIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </svg>
);

export const ChevronRightIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </svg>
);

export const ImageIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.5" cy="10" r="1.6" />
    <path d="m4 17 5-4.5 4.5 4 3-2.5L20 17.5" />
  </svg>
);

export const SunIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </svg>
);

export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
    <path d="M5 18h14" />
  </svg>
);

export const EditIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 7.5 2 2" />
  </svg>
);

export const TagIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M11.5 3.5h6a2 2 0 0 1 2 2v6a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1 0-2.8l8-8a2 2 0 0 1 1.4-.6Z" />
    <circle cx="16" cy="8" r="1.4" />
  </svg>
);

export const ScanIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 1-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2" />
    <path d="M4 12h16" opacity=".6" />
  </svg>
);

export const ExternalLinkIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    <path d="M14 4h6v6" />
    <path d="m20 4-9.5 9.5" />
  </svg>
);
