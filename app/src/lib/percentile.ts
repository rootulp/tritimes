/**
 * Format a raw percentile value (as returned by getDisciplineHistogram) into a
 * "Top X%" label for UI display.
 *
 * The input is the share of the field the athlete beat (higher is better) and may
 * be fractional. It is flipped to the rank-from-top convention used by the summary
 * cards ("Top X%", where lower is better): an athlete who beat 37% of the field
 * finished ahead of nobody else in the remaining 63%, so they are in the Top 63%.
 *
 * The result is rounded and clamped to [1, 99] so the chip never shows an
 * impossible extreme: a race winner (e.g. beat 2177/2178 = 99.95%) renders as
 * "Top 1%" rather than "Top 0%", and a back-of-pack finisher renders as "Top 99%"
 * rather than "Top 100%".
 *
 * An input of 0 is treated as "no data available" because getDisciplineHistogram
 * returns 0 when the histogram is missing or empty (a finisher who beat at least
 * one athlete always has a strictly positive value).
 */
export function formatTopPercent(percentile: number): string {
  if (!Number.isFinite(percentile) || percentile <= 0) return "—";
  const top = Math.min(99, Math.max(1, Math.round(100 - percentile)));
  return `Top ${top}%`;
}
