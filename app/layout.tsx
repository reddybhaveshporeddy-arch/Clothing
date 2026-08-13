import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import ProfileGate from "@/components/ProfileGate";
import { ToastProvider } from "@/components/Toast";

// Warm humanist sans for UI and body copy — replaces the Inter default.
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Fraunces carries the display voice: headings, outfit names, the wordmark.
// Its "soft" optical size and real italics are what make this read as
// dressing-room rather than dashboard.
const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Fit Check — Wardrobe & Outfit Planner",
  description:
    "Your closet, your outfits, your wear history — all in one place.",
};

export const viewport: Viewport = {
  themeColor: "#120d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans">
        <ToastProvider>
          <ProfileGate>
            <TopBar />
            <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 md:pb-12">
              {children}
            </main>
            <BottomNav />
          </ProfileGate>
        </ToastProvider>
      </body>
    </html>
  );
}
