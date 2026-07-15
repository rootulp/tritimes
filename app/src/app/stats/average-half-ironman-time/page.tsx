import type { Metadata } from "next";
import { getDistanceStats } from "@/lib/data";
import { formatTime } from "@/lib/format";
import AverageTimeArticle from "@/components/AverageTimeArticle";

export const revalidate = false;

export function generateMetadata(): Metadata {
  const stats = getDistanceStats("70.3");
  const title = "Average IRONMAN 70.3 Time (Half Ironman) by Age Group";
  const description = `The median IRONMAN 70.3 finish time is ${formatTime(stats.finish.medianSeconds)}, based on ${stats.finisherCount.toLocaleString()} finishers. See averages by age group, gender, and year, plus swim, bike, and run splits.`;

  return {
    title,
    description,
    alternates: { canonical: "/stats/average-half-ironman-time" },
    openGraph: { title, description, url: "/stats/average-half-ironman-time" },
  };
}

export default function AverageHalfIronmanTimePage() {
  return (
    <AverageTimeArticle
      distance="70.3"
      fullLabel="IRONMAN 70.3"
      altLabel="also known as a half Ironman"
      courseDescription="An IRONMAN 70.3 covers a 1.2-mile (1.9 km) swim, a 56-mile (90 km) bike, and a 13.1-mile (21.1 km) half marathon."
      cutoffText="8 hours 30 minutes"
      other={{
        href: "/stats/average-ironman-time",
        label: "Average full-distance IRONMAN finish time",
      }}
    />
  );
}
