import type { ComponentChildren } from "preact";
import type { DistanceStats } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { DISCIPLINE_COLORS } from "@/lib/colors";
import ResultCard from "./ResultCard";

export interface AverageTimeArticleProps {
  stats: DistanceStats;
  /** The finish-time histogram (an island rendered by the Astro page). */
  histogram?: ComponentChildren;
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
  stats,
  histogram,
  fullLabel,
  altLabel,
  courseDescription,
  cutoffText,
  other,
}: AverageTimeArticleProps) {
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
      answer: `Across ${stats.finisherCount.toLocaleString("en-US")} finishers at ${stats.raceCount.toLocaleString("en-US")} ${fullLabel} races (${yearRange}), the median finish time is ${formatTime(finish.medianSeconds)} and the average is ${formatTime(finish.averageSeconds)}. The median for men is ${male ? formatTime(male.medianSeconds) : "—"} and for women ${female ? formatTime(female.medianSeconds) : "—"}.`,
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
      question: `How long do you have to finish an ${fullLabel}?`,
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
    <main id="main-content" className="max-w-4xl w-full mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Average {fullLabel} Finish Time
        </h1>
        <p className="text-secondary mt-1">
          Based on {stats.finisherCount.toLocaleString("en-US")} finisher results from{" "}
          {stats.raceCount.toLocaleString("en-US")} races on {stats.courseCount} courses, {yearRange}
        </p>
      </header>

      <section className="mb-10 space-y-4 text-secondary leading-relaxed">
        <p>
          The median {fullLabel} ({altLabel}) finish time is{" "}
          <strong className="text-foreground">{formatTime(finish.medianSeconds)}</strong>. The average
          is {formatTime(finish.averageSeconds)} — slightly slower than the median because long
          finishes stretch the tail of the distribution. {courseDescription}
        </p>
        <p>
          Men finish in a median of{" "}
          <strong className="text-foreground">{male ? formatTime(male.medianSeconds) : "—"}</strong>{" "}
          and women in{" "}
          <strong className="text-foreground">{female ? formatTime(female.medianSeconds) : "—"}</strong>
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
        <h2 className="text-xl font-bold text-foreground mb-4">Finish Time Distribution</h2>
        <div className="bg-surface rounded-xl border border-line p-6">
          {histogram}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-4">Median Splits</h2>
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
              className="bg-surface rounded-lg border border-line p-4 text-center"
            >
              <div className="text-sm mb-1" style={{ color: DISCIPLINE_COLORS[label] }}>
                {label}
              </div>
              <div className="text-2xl font-bold text-foreground">{formatTime(seconds)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-4">
          What Is a Good {fullLabel} Time?
        </h2>
        <p className="text-secondary leading-relaxed mb-4">
          Percentiles are a better yardstick than a single number. Here is where the whole field
          lands:
        </p>
        <div className="bg-surface rounded-lg border border-line overflow-x-auto" tabIndex={0} role="region" aria-label="Finish-time comparison table; scroll horizontally for all columns">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b border-line text-secondary">
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
                <tr key={label} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 text-foreground">{label}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    under {formatTime(seconds)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Average {fullLabel} Time by Age Group
        </h2>
        <div className="bg-surface rounded-lg border border-line overflow-x-auto" tabIndex={0} role="region" aria-label="Finish-time comparison table; scroll horizontally for all columns">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-line text-secondary">
                <th className="text-left px-4 py-3 font-medium">Age Group</th>
                <th className="text-right px-4 py-3 font-medium">Men (median)</th>
                <th className="text-right px-4 py-3 font-medium">Finishers</th>
                <th className="text-right px-4 py-3 font-medium">Women (median)</th>
                <th className="text-right px-4 py-3 font-medium">Finishers</th>
              </tr>
            </thead>
            <tbody>
              {ageGroupRows.map((row) => (
                <tr key={row.bracket} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 font-medium text-foreground">{bracketLabel(row.bracket)}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {row.male ? formatTime(row.male.medianSeconds) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-secondary">
                    {row.male ? row.male.count.toLocaleString("en-US") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {row.female ? formatTime(row.female.medianSeconds) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-secondary">
                    {row.female ? row.female.count.toLocaleString("en-US") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-4">Median Finish Time by Year</h2>
        <div className="bg-surface rounded-lg border border-line overflow-x-auto" tabIndex={0} role="region" aria-label="Finish-time comparison table; scroll horizontally for all columns">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b border-line text-secondary">
                <th className="text-left px-4 py-3 font-medium">Year</th>
                <th className="text-right px-4 py-3 font-medium">Median Finish</th>
                <th className="text-right px-4 py-3 font-medium">Finishers</th>
              </tr>
            </thead>
            <tbody>
              {stats.byYear.map((y) => (
                <tr key={y.year} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 text-foreground">{y.year}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {formatTime(y.medianSeconds)}
                  </td>
                  <td className="px-4 py-3 text-right text-secondary">{y.count.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="text-base font-semibold text-foreground mb-1">{faq.question}</h3>
              <p className="text-secondary leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line pt-6 text-secondary">
        <h2 className="text-base font-semibold text-foreground mb-2">Keep Exploring</h2>
        <ul className="space-y-1 text-sm">
          <li>
            <a href={other.href} className="text-accent hover:underline">
              {other.label}
            </a>
          </li>
          <li>
            <a href="/courses" className="text-accent hover:underline">
              Which courses are fastest? Course difficulty rankings
            </a>
          </li>
          <li>
            <a href="/races" className="text-accent hover:underline">
              Browse every race and find your own result
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
