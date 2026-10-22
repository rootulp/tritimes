import GlobalSearchBar from "./GlobalSearchBar";

/** Body of the 404 page; also shown by the result/athlete pages for unknown URLs. */
export default function NotFoundContent() {
  return (
    <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
      <div className="flex flex-col items-center text-center pt-16 pb-20">
        <p className="text-sm font-semibold tracking-widest text-accent uppercase mb-3">404</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Page not found</h1>
        <p className="text-secondary max-w-md mb-10 leading-relaxed">
          This page doesn&apos;t exist — the link may be stale, or the race or result may have moved. Try searching for an
          athlete below.
        </p>

        <div className="w-full max-w-lg mb-10">
          <GlobalSearchBar />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="/" className="px-5 py-2.5 rounded-lg bg-action hover:bg-action text-on-action font-semibold transition-colors">
            Go home
          </a>
          <a
            href="/races"
            className="px-5 py-2.5 rounded-lg border border-line/80 bg-surface hover:border-strong text-foreground font-semibold transition-colors"
          >
            Browse races
          </a>
        </div>
      </div>
    </main>
  );
}

/** Marks a client-rendered page as a 404 for crawlers and the tab title. */
export function markNotFound() {
  document.title = "Page not found | TriTimes";
  const meta = document.createElement("meta");
  meta.name = "robots";
  meta.content = "noindex";
  document.head.appendChild(meta);
}

/** Sets the title, description, and canonical URL of a client-rendered page. */
export function setPageMeta(title: string, description: string, canonical: string) {
  document.title = `${title} | TriTimes`;
  const set = (selector: string, attr: string, value: string) =>
    document.querySelector(selector)?.setAttribute(attr, value);
  set('meta[name="description"]', "content", description);
  set('meta[property="og:title"]', "content", title);
  set('meta[property="og:description"]', "content", description);
  set('meta[property="og:url"]', "content", `https://tritimes.org${canonical}`);
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = `https://tritimes.org${canonical}`;
}
