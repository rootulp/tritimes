import { useEffect, useRef, useState } from "preact/hooks";
import { drawShareCard, type ShareCard } from "@/lib/share-image";

interface ShareDialogProps {
  url: string;
  card: ShareCard;
  /** Suggested filename for the downloaded image (no extension). */
  filename: string;
}

export default function ShareDialog({ url, card, filename }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch {
      setToast("Copy failed — select the URL bar");
    }
    setOpen(false);
  }

  async function handleDownload() {
    setOpen(false);
    await document.fonts.ready;
    const blob = await drawShareCard(card);
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${filename}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <span aria-hidden="true">↗</span>
        <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Share this result"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-700 bg-gray-900 p-1 shadow-lg z-10"
        >
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/[0.08]"
          >
            <span aria-hidden="true">🔗</span>
            Copy link
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white hover:bg-white/[0.08]"
          >
            <span aria-hidden="true">⬇</span>
            Download image
          </button>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-2 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
