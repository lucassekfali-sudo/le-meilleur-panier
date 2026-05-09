import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

/**
 * === Le Meilleur Panier 2.0 — Typography ===
 *
 *  - Plus Jakarta Sans : modern geometric sans-serif for body / UI / buttons.
 *    Variable + accessible, replaces the default Geist for a more refined feel.
 *  - Instrument Serif  : expressive editorial serif used for hero titles and
 *    splash moments. Keeps the app feeling premium without being heavy.
 *  - Geist Mono        : kept for tabular numbers, prices, codes.
 */
const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Le Meilleur Panier 2.0",
  description:
    "Liste de courses intelligente avec comparaison de prix et gestion de budget",
  keywords: [
    "shopping",
    "liste de courses",
    "budget",
    "comparaison de prix",
    "PWA",
  ],
  authors: [{ name: "Le Meilleur Panier" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Panier 2.0",
  },
};

export const viewport: Viewport = {
  themeColor: "#c97c5d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${sans.variable} ${serif.variable} ${mono.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
