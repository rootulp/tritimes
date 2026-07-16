import type { Metadata } from "next";
import { FAQ_ITEMS, buildFaqJsonLd } from "@/lib/faq";

export const revalidate = false;

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about TriTimes — where the race data comes from, whether it's affiliated with IRONMAN, and how to report issues.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ",
    description:
      "Frequently asked questions about TriTimes — where the race data comes from and how it works.",
    url: "/faq",
  },
};

export default function FaqPage() {
  return (
    <main className="max-w-3xl w-full mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd()) }}
      />
      <h1 className="text-3xl font-bold text-white mb-8">
        Frequently Asked Questions
      </h1>
      <dl className="space-y-8">
        {FAQ_ITEMS.map((item) => (
          <div key={item.question}>
            <dt className="text-lg font-semibold text-white mb-2">
              {item.question}
            </dt>
            <dd className="text-gray-400 leading-relaxed">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
