export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getSearchIndex } = await import("@/lib/search-index");
    const { getRaces } = await import("@/lib/data");
    getSearchIndex();
    getRaces();
  }
}
