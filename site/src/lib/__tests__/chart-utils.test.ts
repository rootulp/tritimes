import { describe, it, expect } from "vitest";
import {
  cursorXToDataIndex,
  computeLabelStep,
  isProCourse,
  truncateLabel,
} from "../chart-utils";

const MARGIN = { left: 55, right: 10 };
const VIEW_BOX = { width: 500, height: 250 };

function rect(width: number, height: number) {
  return { left: 0, width, height };
}

// The percentile chart places dot i at viewBox X = MARGIN.left + ((i + 0.5) / n) * plotWidth.
function dotViewBoxX(i: number, n: number) {
  const plotWidth = VIEW_BOX.width - MARGIN.left - MARGIN.right;
  return MARGIN.left + ((i + 0.5) / n) * plotWidth;
}

// Convert a viewBox X to a client X given preserveAspectRatio="xMidYMid meet".
function viewBoxXToClientX(vbX: number, r: { left: number; width: number; height: number }) {
  const scale = Math.min(r.width / VIEW_BOX.width, r.height / VIEW_BOX.height);
  const offsetX = (r.width - VIEW_BOX.width * scale) / 2;
  return r.left + offsetX + vbX * scale;
}

describe("cursorXToDataIndex", () => {
  it("maps cursor over each dot to the matching index when container width equals viewBox width", () => {
    const r = rect(500, 250);
    const n = 10;
    for (let i = 0; i < n; i++) {
      const clientX = viewBoxXToClientX(dotViewBoxX(i, n), r);
      expect(
        cursorXToDataIndex({ clientX, rect: r, viewBox: VIEW_BOX, margin: MARGIN, dataLength: n }),
      ).toBe(i);
    }
  });

  it("maps cursor over the rightmost dot to the last index when container is wider than viewBox", () => {
    // Reproduces the bug: SVG is rendered with preserveAspectRatio="xMidYMid meet",
    // so when the container is wider than the viewBox aspect ratio, the content is
    // centered with horizontal padding. The naive mapping ignores that offset and
    // returns a wrong (earlier) index for points near the right edge.
    const r = rect(1000, 250);
    const n = 10;
    const clientX = viewBoxXToClientX(dotViewBoxX(n - 1, n), r);
    expect(
      cursorXToDataIndex({ clientX, rect: r, viewBox: VIEW_BOX, margin: MARGIN, dataLength: n }),
    ).toBe(n - 1);
  });

  it("maps cursor over every dot correctly when container is wider than viewBox", () => {
    const r = rect(1200, 250);
    const n = 10;
    for (let i = 0; i < n; i++) {
      const clientX = viewBoxXToClientX(dotViewBoxX(i, n), r);
      expect(
        cursorXToDataIndex({ clientX, rect: r, viewBox: VIEW_BOX, margin: MARGIN, dataLength: n }),
      ).toBe(i);
    }
  });

  it("returns null when the cursor is outside the plot area", () => {
    const r = rect(1000, 250);
    // Far left of the rendered SVG box, before the content even starts.
    expect(
      cursorXToDataIndex({ clientX: 5, rect: r, viewBox: VIEW_BOX, margin: MARGIN, dataLength: 10 }),
    ).toBeNull();
    // Far right.
    expect(
      cursorXToDataIndex({ clientX: 995, rect: r, viewBox: VIEW_BOX, margin: MARGIN, dataLength: 10 }),
    ).toBeNull();
  });

  it("returns null when dataLength is zero", () => {
    const r = rect(500, 250);
    expect(
      cursorXToDataIndex({ clientX: 250, rect: r, viewBox: VIEW_BOX, margin: MARGIN, dataLength: 0 }),
    ).toBeNull();
  });
});

describe("computeLabelStep", () => {
  // Each "Sep 2024"-style label is roughly 50px wide at the chart's font size.
  const MIN_SPACING = 50;

  it("skips labels when per-label spacing is smaller than the label width", () => {
    // 10 labels across a 435px plot = 43.5px per label, smaller than a 50px label.
    // The current code returns floor(10/8)=1, which is the bug — every label is
    // drawn and they overlap. We want step >= 2 so labels do not collide.
    const step = computeLabelStep({ dataLength: 10, plotWidthPx: 435, minLabelSpacingPx: MIN_SPACING });
    expect(step).toBeGreaterThanOrEqual(2);
  });

  it("returns 1 when there is enough room for every label", () => {
    // 5 labels across 500px = 100px per label, twice the label width.
    expect(
      computeLabelStep({ dataLength: 5, plotWidthPx: 500, minLabelSpacingPx: MIN_SPACING }),
    ).toBe(1);
  });

  it("returns 1 for a single data point", () => {
    expect(
      computeLabelStep({ dataLength: 1, plotWidthPx: 500, minLabelSpacingPx: MIN_SPACING }),
    ).toBe(1);
  });

  it("scales the step up as the data length grows", () => {
    const step20 = computeLabelStep({ dataLength: 20, plotWidthPx: 435, minLabelSpacingPx: MIN_SPACING });
    const step40 = computeLabelStep({ dataLength: 40, plotWidthPx: 435, minLabelSpacingPx: MIN_SPACING });
    expect(step20).toBeGreaterThanOrEqual(3);
    expect(step40).toBeGreaterThanOrEqual(step20);
  });
});

describe("isProCourse", () => {
  it("flags courses whose display name ends with the Pros suffix", () => {
    expect(isProCourse("Dallas-Little Elm - Pros")).toBe(true);
    expect(isProCourse("Davao - Pros")).toBe(true);
  });

  it("does not flag age-group courses", () => {
    expect(isProCourse("Melbourne")).toBe(false);
    expect(isProCourse("Berlin-Brandenburg")).toBe(false);
    expect(isProCourse("Punta del Este")).toBe(false);
  });

  it("only matches the trailing ' - Pros' suffix, not the word elsewhere", () => {
    expect(isProCourse("Pros Valley")).toBe(false);
    expect(isProCourse("Prosser")).toBe(false);
  });
});

describe("truncateLabel", () => {
  it("leaves labels at or under the limit unchanged", () => {
    expect(truncateLabel("Melbourne", 18)).toBe("Melbourne");
    expect(truncateLabel("Berlin-Brandenburg", 18)).toBe("Berlin-Brandenburg");
  });

  it("truncates longer labels to the limit with an ellipsis", () => {
    const out = truncateLabel("Berlin-Brandenburg Extra Long", 18);
    expect(out.length).toBeLessThanOrEqual(18);
    expect(out.endsWith("…")).toBe(true);
  });

  it("does not leave a trailing space before the ellipsis", () => {
    // "Sunshine Coast XY" cut at 15 chars would land mid-space; trim it.
    const out = truncateLabel("Sunshine Coast XYZ", 15);
    expect(out).not.toMatch(/ …$/);
    expect(out.endsWith("…")).toBe(true);
  });
});
