// Draws the 1200×630 result share card in the browser. It replaces the
// server-rendered /race/<slug>/result/<id>/opengraph-image endpoint, keeping
// the same layout: name, race meta, hero finish time, percentiles, splits.

// The downloadable card has its own fixed dark canvas, independent of the page
// theme. Canvas fillStyle cannot resolve CSS custom properties.
const SHARE_COLORS = { Swim: "#82b2ff", Bike: "#ff8b95", Run: "#edbf66" };

export interface ShareCard {
  name: string;
  flag: string;
  meta: string;
  finishTime: string;
  overallPct: number;
  ageGroupPct: number;
  splits: { label: "Swim" | "Bike" | "Run"; time: string }[];
}

const W = 1200;
const H = 630;
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function drawShareCard(card: ShareCard): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0f172a");
  bg.addColorStop(0.5, "#1e293b");
  bg.addColorStop(1, "#0f172a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(card.flag ? `${card.flag}  ${card.name}` : card.name, 64, 56 + 44);
  ctx.fillStyle = "#94a3b8";
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText(card.meta, 64, 56 + 44 + 6 + 26);

  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = `400 18px ${FONT}`;
  ctx.letterSpacing = "3px";
  ctx.fillText("FINISH TIME", W / 2, 210);
  ctx.letterSpacing = "-2px";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 140px ${FONT}`;
  ctx.fillText(card.finishTime, W / 2, 335);
  ctx.letterSpacing = "0px";

  // "Overall Top X%     Age Group Top Y%"
  const parts: [string, string][] = [
    ["Overall ", `Top ${card.overallPct}%`],
    ["Age Group ", `Top ${card.ageGroupPct}%`],
  ];
  ctx.font = `400 24px ${FONT}`;
  const widths = parts.map(([label, value]) => {
    ctx.font = `400 24px ${FONT}`;
    const lw = ctx.measureText(label).width;
    ctx.font = `700 24px ${FONT}`;
    return [lw, ctx.measureText(value).width];
  });
  const gap = 36;
  const total = widths.reduce((s, [a, b]) => s + a + b, 0) + gap;
  let x = W / 2 - total / 2;
  ctx.textAlign = "left";
  parts.forEach(([label, value], i) => {
    ctx.font = `400 24px ${FONT}`;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(label, x, 383);
    x += widths[i][0];
    ctx.font = `700 24px ${FONT}`;
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(value, x, 383);
    x += widths[i][1] + gap;
  });

  const boxGap = 24;
  const boxW = (W - 128 - boxGap * 2) / 3;
  card.splits.forEach((split, i) => {
    const bx = 64 + i * (boxW + boxGap);
    const by = 433;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, 110, 12);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.letterSpacing = "2px";
    ctx.fillStyle = SHARE_COLORS[split.label];
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(split.label.toUpperCase(), bx + boxW / 2, by + 42);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 38px ${FONT}`;
    ctx.fillText(split.time, bx + boxW / 2, by + 88);
  });

  ctx.textAlign = "right";
  ctx.fillStyle = "#64748b";
  ctx.letterSpacing = "1px";
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText("tritimes.org", W - 36, H - 28);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
