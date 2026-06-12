export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Warm the race-manifest cache before the first request. Import only
    // @/lib/races here: instrumentation is bundled into EVERY Node function,
    // so importing @/lib/data would copy the ~190MB data corpus into every
    // function's traced bundle and add seconds of cold start (#216).
    const { getRaces } = await import("@/lib/races");
    getRaces();
  }
}
