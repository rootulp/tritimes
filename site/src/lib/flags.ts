const COUNTRY_FLAGS: Record<string, string> = {
  USA: "\u{1F1FA}\u{1F1F8}",
  Canada: "\u{1F1E8}\u{1F1E6}",
  UK: "\u{1F1EC}\u{1F1E7}",
  Australia: "\u{1F1E6}\u{1F1FA}",
  France: "\u{1F1EB}\u{1F1F7}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  Spain: "\u{1F1EA}\u{1F1F8}",
  Denmark: "\u{1F1E9}\u{1F1F0}",
  Mexico: "\u{1F1F2}\u{1F1FD}",
  Chile: "\u{1F1E8}\u{1F1F1}",
  Switzerland: "\u{1F1E8}\u{1F1ED}",
  "New Zealand": "\u{1F1F3}\u{1F1FF}",
  "South Africa": "\u{1F1FF}\u{1F1E6}",
  Bahrain: "\u{1F1E7}\u{1F1ED}",
  Wales: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
};

export function getCountryFlag(location: string): string {
  for (const [country, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (location.endsWith(country) || location === country) {
      return flag;
    }
  }
  // Handle "Wales, UK" specifically
  if (location.includes("Wales")) return COUNTRY_FLAGS.Wales;
  return "";
}

export function getCountryFlagISO(iso: string): string {
  if (!iso || iso.length !== 2) return "";
  const upper = iso.toUpperCase();
  return String.fromCodePoint(
    0x1f1e6 + upper.charCodeAt(0) - 65,
    0x1f1e6 + upper.charCodeAt(1) - 65,
  );
}
