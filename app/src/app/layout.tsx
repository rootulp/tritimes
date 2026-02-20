import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Header from "@/components/Header";
import CommandPalette from "@/components/CommandPalette";
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
  title: "TriTimes — Triathlon Result Distributions",
  description:
    "View your IronMan 70.3 triathlon results with statistical distributions for swim, bike, run, and total time.",
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
        <CommandPalette />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
