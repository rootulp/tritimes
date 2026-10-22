/**
 * Normalizes display casing of athlete names scraped from ironman.com.
 *
 * Only tokens that are FULLY uppercase (with at least two letters) are
 * title-cased; mixed-case tokens ("McDonald", "van der Berg") are left
 * untouched. When lowering an all-caps token, hyphenated and
 * apostrophe-separated parts are each title-cased ("SMITH-JONES" ->
 * "Smith-Jones", "O'BRIEN" -> "O'Brien") and "Mc" prefixes are restored
 * ("MCDONALD" -> "McDonald"). "Mac" is ambiguous and intentionally not
 * special-cased. Accented uppercase letters are handled ("MÜLLER" ->
 * "Müller").
 */
export function formatAthleteName(name: string): string {
  return name
    .split(/(\s+)/)
    .map((token) => (isAllCaps(token) ? titleCaseToken(token) : token))
    .join("");
}

/** True when the token has >= 2 letters and every letter is uppercase. */
function isAllCaps(token: string): boolean {
  const letters = token.match(/\p{L}/gu);
  if (!letters || letters.length < 2) return false;
  return letters.every((c) => c !== c.toLowerCase() && c === c.toUpperCase());
}

function titleCaseToken(token: string): string {
  return token
    .split(/([-'’])/)
    .map(titleCasePart)
    .join("");
}

function titleCasePart(part: string): string {
  if (!part) return part;
  const lower = part.toLowerCase();
  const cased = lower.charAt(0).toUpperCase() + lower.slice(1);
  if (/^Mc\p{Ll}/u.test(cased)) {
    return `Mc${cased.charAt(2).toUpperCase()}${cased.slice(3)}`;
  }
  return cased;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
