import { h, render } from "preact";
import CommandPalette from "./CommandPalette";

let mounted = false;

export function openPalette() {
  if (mounted) {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
    return;
  }
  mounted = true;
  const root = document.createElement("div");
  document.body.appendChild(root);
  render(h(CommandPalette, { defaultOpen: true }), root);
}
