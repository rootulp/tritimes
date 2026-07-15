import Link from "next/link";
import dynamic from "next/dynamic";
import { getDistanceStats } from "@/lib/data";
import { formatTime } from "@/lib/format";
import { DISCIPLINE_COLORS } from "@/lib/colors";
import ResultCard from "./ResultCard";

const RaceHistogram = dynamic(() => import("./RaceHistogram"), {
  loading: () => <div className="h-52 bg-gray-800 rounded animate-pulse" />,
});

export interface AverageTimeArticleProps {
  /** Data key into distance-stats.json.gz. */
  distance: "70.3" | "140.6";
  /** Branded name used in headings and prose, e.g. "IRONMAN 70.3". */
  fullLabel: string;
  /** Colloquial name used in prose, e.g. "half Ironman". */
  altLabel: string;
  /** One-sentence course description used in the intro. */
  courseDescription: string;
  /** Official course time limit, phrased for prose (e.g. "8 hours 30 minutes"). */
  cutoffText: string;
  /** Link to the sibling average-time page. */
  other: { href: string; label: string };
}

interface Faq {
  question: string;
  answer: string;
}

/** "18-24" → "18–24", "PRO" → "Pro". */
function bracketLabel(bracket: string): string {
  if (bracket === "PRO") return "Pro";
  return bracket.replace("-", "–");
}

/**
 * Shared article body for the /stats/average-*-time landing pages. A server
 * component: all numbers come from the precomputed distance-stats artifact,
 * so the page prerenders statically at build time.
 */
export default function AverageTimeArticle({
  distance,
  fullLabel,
  altLabel,
  courseDescription,
  cutoffText,
  other,
}: AverageTimeArticleProps) {
  const stats = getDistanceStats(distance);
  const { finish } = stats;

  const male = stats.byGender.find((g) => g.gender === "Male");
  const female = stats.byGender.find((g) => g.gender === "Female");

  // Show standard age-group brackets plus Pro; hide para-athlete support
  // categories (Guide, ST) whose tiny samples aren't meaningful medians.
  const ageGroupRows = stats.byAgeGroup.filter(
    (row) => /^\d/.test(row.bracket) || row.bracket === "PRO"
  );

  const yearRange =
    stats.firstYear && stats.lastYear ? `${stats.firstYear}–${stats.lastYear}` : "all years";

  const faqs: Faq[] = [
    {
      question: `What is the average ${fullLabel} time?`,
      answer: `Across ${stats.finisherCount.toLocaleString()} finishers at ${stats.raceCount.toLocaleString()} ${fullLabel} races (${yearRange}), the median finish time is ${formatTime(finish.medianSeconds)} and the average is ${formatTime(finish.averageSeconds)}. The median for men is ${male ? formatTime(male.medianSeconds) : "—"} and for women ${female ? formatTime(female.medianSeconds) : "—"}.`,
    },
    {
      question: `What is a good ${fullLabel} time?`,
      answer: `A finish under ${formatTime(finish.p25Seconds)} puts you in the fastest 25% of all ${fullLabel} finishers, and under ${formatTime(finish.p10Seconds)} puts you in the fastest 10%. "Good" depends heavily on age group — compare against your own bracket in the table on this page.`,
    },
    {
      question: `What are average ${fullLabel} splits for swim, bike, and run?`,
      answer: `The median ${fullLabel} swim is ${formatTime(stats.medianSwimSeconds)}, the median bike is ${formatTime(stats.medianBikeSeconds)}, and the median run is ${formatTime(stats.medianRunSeconds)}.`,
    },
    {
      question: `How long do you have to finish a ${fullLabel}?`,
      answer: `The official ${fullLabel} course time limit is typically ${cutoffText}, with intermediate cutoffs for the swim and bike. Exact cutoffs vary slightly by race.`,
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <main className="max-w-4xl w-full mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Average {fullLabel} Finish Time
        </h1>
        <p className="text-gray-400 mt-1">
          Based on {stats.finisherCount.toLocaleString()} finisher results from{" "}
          {stats.raceCount.toLocaleString()} races on {stats.courseCount} courses, {yearRange}
        </p>
      </header>

      <section className="mb-10 space-y-4 text-gray-300 leading-relaxed">
        <p>
          The median {fullLabel} ({altLabel}) finish time is{" "}
          <strong className="text-white">{formatTime(finish.medianSeconds)}</strong>. The average
          is {formatTime(finish.averageSeconds)} — slightly slower than the median because long
          finishes stretch the tail of the distribution. {courseDescription}
        </p>
        <p>
          Men finish in a median of{" "}
          <strong className="text-white">{male ? formatTime(male.medianSeconds) : "—"}</strong>{" "}
          and women in{" "}
          <strong className="text-white">{female ? formatTime(female.medianSeconds) : "—"}</strong>
          . The fastest 10% of the field come in under {formatTime(finish.p10Seconds)}, while the
          course limit of roughly {cutoffText} means every finisher on this page beat the clock.
        </p>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <ResultCard label="Median Finish" value={formatTime(finish.medianSeconds)} />
        <ResultCard label="Average Finish" value={formatTime(finish.averageSeconds)} />
        <ResultCard label="Top 10% Under" value={formatTime(finish.p10Seconds)} />
        <ResultCard label="Top 25% Under" value={formatTime(finish.p25Seconds)} />
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Finish Time Distribution</h2>
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
          <RaceHistogram
            data={stats.histogram}
            color={DISCIPLINE_COLORS["Total"]}
            label={`${fullLabel} Finish Distribution`}
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Median Splits</h2>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {(
            [
              ["Swim", stats.medianSwimSeconds],
              ["Bike", stats.medianBikeSeconds],
              ["Run", stats.medianRunSeconds],
            ] as const
          ).map(([label, seconds]) => (
            <div
              key={label}
              className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center"
            >
              <div className="text-sm mb-1" style={{ color: DISCIPLINE_COLORS[label] }}>
                {label}
              </div>
              <div className="text-2xl font-bold text-white">{formatTime(seconds)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">
          What Is a Good {fullLabel} Time?
        </h2>
        <p className="text-gray-300 leading-relaxed mb-4">
          Percentiles are a better yardstick than a single number. Here is where the whole field
          lands:
        </p>
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Field Position</th>
                <th className="text-right px-4 py-3 font-medium">Finish Time</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Top 10%", finish.p10Seconds],
                  ["Top 25%", finish.p25Seconds],
                  ["Top 50% (median)", finish.medianSeconds],
                  ["Top 75%", finish.p75Seconds],
                  ["Top 90%", finish.p90Seconds],
                ] as const
              ).map(([label, seconds]) => (
                <tr key={label} className="border-b border-gray-800 last:border-b-0">
                  <td className="px-4 py-3 text-white">{label}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    under {formatTime(seconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">
          Average {fullLabel} Time by Age Group
        </h2>
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Age Group</th>
                <th className="text-right px-4 py-3 font-medium">Men (median)</th>
                <th className="text-right px-4 py-3 font-medium">Finishers</th>
                <th className="text-right px-4 py-3 font-medium">Women (median)</th>
                <th className="text-right px-4 py-3 font-medium">Finishers</th>
              </tr>
            </thead>
            <tbody>
              {ageGroupRows.map((row) => (
                <tr key={row.bracket} className="border-b border-gray-800 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-white">{bracketLabel(row.bracket)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    {row.male ? formatTime(row.male.medianSeconds) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {row.male ? row.male.count.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    {row.female ? formatTime(row.female.medianSeconds) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {row.female ? row.female.count.toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Median Finish Time by Year</h2>
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Year</th>
                <th className="text-right px-4 py-3 font-medium">Median Finish</th>
                <th className="text-right px-4 py-3 font-medium">Finishers</th>
              </tr>
            </thead>
            <tbody>
              {stats.byYear.map((y) => (
                <tr key={y.year} className="border-b border-gray-800 last:border-b-0">
                  <td className="px-4 py-3 text-white">{y.year}</td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    {formatTime(y.medianSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{y.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="text-base font-semibold text-white mb-1">{faq.question}</h3>
              <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-800 pt-6 text-gray-300">
        <h2 className="text-base font-semibold text-white mb-2">Keep Exploring</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <Link href={other.href} className="text-blue-400 hover:underline">
              {other.label}
            </Link>
          </li>
          <li>
            <Link href="/courses" className="text-blue-400 hover:underline">
              Which courses are fastest? Course difficulty rankings
            </Link>
          </li>
          <li>
            <Link href="/races" className="text-blue-400 hover:underline">
              Browse every race and find your own result
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
