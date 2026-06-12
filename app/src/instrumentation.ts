export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getRaces } = await import("@/lib/data");
    getRaces();
  }
}
