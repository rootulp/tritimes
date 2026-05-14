"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CommandPalette = dynamic(() => import("./CommandPalette"), {
  ssr: false,
});

export default function LazyCommandPalette() {
  // Defer loading the palette chunk (and its useAthleteSearch dep) until the
  // user first reaches for it. Saves a chunk + listeners on every page entry.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setMounted(true);
      }
    }
    function onOpenEvent() {
      setMounted(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpenEvent);
    };
  }, [mounted]);

  if (!mounted) return null;
  return <CommandPalette defaultOpen />;
}
