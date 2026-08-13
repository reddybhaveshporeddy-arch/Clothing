import type { MetadataRoute } from "next";

/**
 * Lets the app be added to a phone's home screen and open without browser
 * chrome — the difference between "a website I saved" and something that
 * behaves like an installed app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fit Check — Wardrobe & Outfit Planner",
    short_name: "Fit Check",
    description:
      "Your closet, your outfits, your wear history — all in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#120d16",
    theme_color: "#120d16",
    orientation: "portrait",
    // Static files from scripts/generate-icons.mjs. app/icon.png and
    // app/apple-icon.png are picked up by Next automatically; these two are
    // what Android uses when the app is added to the home screen.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
