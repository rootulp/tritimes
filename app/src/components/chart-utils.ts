// Pure helpers for the SVG charts in AthletePerformanceCharts.

// Map a cursor's clientX to the data index for a chart whose SVG uses
// viewBox-based scaling with preserveAspectRatio="xMidYMid meet". When the
// rendered SVG element is wider than the viewBox aspect ratio, the content is
// drawn at uniform scale and centered horizontally, so cursor pixels do not map
// linearly to viewBox X. This helper undoes that offset.
export function cursorXToDataIndex(opts: {
  clientX: number;
  rect: { left: number; width: number; height: number };
  viewBox: { width: number; height: number };
  margin: { left: number; right: number };
  dataLength: number;
}): number | null {
  const { clientX, rect, viewBox, margin, dataLength } = opts;
  if (dataLength <= 0) return null;

  const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);
  if (scale <= 0) return null;
  const offsetX = (rect.width - viewBox.width * scale) / 2;
  const vbX = (clientX - rect.left - offsetX) / scale;

  const plotLeft = margin.left;
  const plotRight = viewBox.width - margin.right;
  if (vbX < plotLeft || vbX > plotRight) return null;

  const plotWidth = plotRight - plotLeft;
  const idx = Math.floor(((vbX - plotLeft) / plotWidth) * dataLength);
  return Math.max(0, Math.min(dataLength - 1, idx));
}

// Choose how many data labels to draw between visible ticks so adjacent labels
// don't collide. Returns the step (1 = every label).
export function computeLabelStep(opts: {
  dataLength: number;
  plotWidthPx: number;
  minLabelSpacingPx: number;
}): number {
  const { dataLength, plotWidthPx, minLabelSpacingPx } = opts;
  if (dataLength <= 1 || plotWidthPx <= 0 || minLabelSpacingPx <= 0) return 1;
  const spacingPerLabel = plotWidthPx / dataLength;
  if (spacingPerLabel >= minLabelSpacingPx) return 1;
  return Math.ceil(minLabelSpacingPx / spacingPerLabel);
}
