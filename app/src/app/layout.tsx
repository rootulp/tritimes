import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Header from "@/components/Header";
import LazyCommandPalette from "@/components/LazyCommandPalette";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tritimes.org"),
  title: {
    default: "TriTimes — IRONMAN & 70.3 Triathlon Results",
    template: "%s | TriTimes",
  },
  description:
    "Look up IRONMAN and IRONMAN 70.3 race results with full-field time distributions. See your percentile for swim, bike, run, and overall across 1,400+ races since 2002.",
  openGraph: {
    siteName: "TriTimes",
    type: "website",
    url: "https://tritimes.org",
  },
  // Set GOOGLE_SITE_VERIFICATION in Vercel to verify the site in Google
  // Search Console without committing the token.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] min-h-dvh flex flex-col`}
      >
        <Header />
        <LazyCommandPalette />
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
