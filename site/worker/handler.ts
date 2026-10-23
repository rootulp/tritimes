/** Keep Cloudflare's asset redirects, rewrites, headers and HTML intact. */
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

// RFC 9110: an explicit representation beats a wildcard, including q=0.
function quality(accept: string, type: string): number {
  let specificity = -1;
  let quality = 0;
  for (const entry of accept.toLowerCase().split(",")) {
    const [mediaRange, ...parameters] = entry.trim().split(";");
    const range = mediaRange.trim();
    const rank = range === type ? 2 : range === `${type.split("/")[0]}/*` ? 1 : range === "*/*" ? 0 : -1;
    if (rank < 0 || rank < specificity) continue;
    const qParameter = parameters.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const qValue = qParameter?.slice(2);
    const q = qValue === undefined ? 1 : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(qValue) ? Number(qValue) : 0;
    if (rank > specificity) quality = q;
    else quality = Math.max(quality, q);
    specificity = rank;
  }
  return quality;
}

export function wantsMarkdown(accept: string): boolean {
  // Wildcards alone keep the existing HTML default.
  return /(?:^|,)\s*text\/markdown\s*(?:;|,|$)/i.test(accept)
    && quality(accept, "text/markdown") > 0
    && quality(accept, "text/markdown") >= quality(accept, "text/html");
}

export function varyAccept(headers: Headers): void {
  const vary = headers.get("Vary");
  if (vary === "*" || vary?.split(",").some((v) => v.trim().toLowerCase() === "accept")) return;
  headers.set("Vary", vary ? `${vary}, Accept` : "Accept");
}

const HOME_MARKDOWN = `# TriTimes — IRONMAN & 70.3 Triathlon Results

Look beyond the finish time. Explore your IRONMAN and IRONMAN 70.3 results and see where you stand in swim, bike, run, and overall performance.

## Find an athlete or race

Use [athlete search](https://tritimes.org/) to find race history by name. [Browse races](https://tritimes.org/races) by event, distance, and year, then open a race to find individual results. Result pages compare discipline splits and finish times with the age group and overall field using distributions and percentiles.

## Compare courses and performance

[Compare courses](https://tritimes.org/courses) using median swim, bike, run, and finish times across race editions. Explore [statistics](https://tritimes.org/stats) for finish-time benchmarks and participation. Comparisons describe recorded results; weather, terrain, and field composition can affect times.

## Guidance and limitations

TriTimes is an independent triathlon analysis site. It is useful for historical results and performance comparisons, rather than live tracking or official registration. Athlete and individual result views require JavaScript; race and course summaries are available as HTML.

- [Frequently asked questions](https://tritimes.org/faq)
- [Agent instructions](https://tritimes.org/llms.txt)
- [Sitemap](https://tritimes.org/sitemap.xml)
`;

const NOT_FOUND_MARKDOWN = `# Page not found

The requested TriTimes page does not exist. Check the URL or use the [sitemap](https://tritimes.org/sitemap.xml) to find an available page. See [agent instructions](https://tritimes.org/llms.txt) for supported uses.
`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const homepage = new URL(request.url).pathname === "/";
    const markdown = wantsMarkdown(request.headers.get("Accept") ?? "");
    let assetRequest = request;
    if (homepage && markdown && (request.method === "GET" || request.method === "HEAD")) {
      // HTML validators and byte ranges cannot validate the Markdown representation.
      const headers = new Headers(request.headers);
      for (const name of ["If-None-Match", "If-Modified-Since", "Range", "If-Range"]) headers.delete(name);
      assetRequest = new Request(request, { headers });
    }
    const asset = await env.ASSETS.fetch(assetRequest);
    if (request.method !== "GET" && request.method !== "HEAD") return asset;
    const negotiable = homepage || asset.status === 404;
    if (!negotiable) return asset;
    const headers = new Headers(asset.headers);
    varyAccept(headers);
    if (markdown && (asset.status === 404 || asset.status === 200)) {
      // Do not carry HTML-specific validators, lengths or encodings across variants.
      for (const name of ["Content-Length", "Content-Encoding", "ETag", "Last-Modified", "Accept-Ranges", "Content-Range"]) headers.delete(name);
      headers.set("Content-Type", "text/markdown; charset=utf-8");
      headers.set("Cache-Control", "no-store");
      return new Response(request.method === "HEAD" ? null : asset.status === 404 ? NOT_FOUND_MARKDOWN : HOME_MARKDOWN,
        { status: asset.status, headers });
    }
    if (asset.status === 404) {
      // Missing assets fall through to this Worker; keep the site's designed HTML 404.
      const errorUrl = new URL("/404", request.url);
      const errorPage = await env.ASSETS.fetch(new Request(errorUrl, { method: request.method }));
      const errorHeaders = new Headers(errorPage.headers);
      varyAccept(errorHeaders);
      return new Response(errorPage.body, { status: 404, headers: errorHeaders });
    }
    return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
  },
};
