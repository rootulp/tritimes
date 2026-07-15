import type { Metadata } from "next";
import { getDistanceStats } from "@/lib/data";
import { formatTime } from "@/lib/format";
import AverageTimeArticle from "@/components/AverageTimeArticle";

export const revalidate = false;

export function generateMetadata(): Metadata {
  const stats = getDistanceStats("140.6");
  const title = "Average IRONMAN Time: Full-Distance Finish Times by Age Group";
  const description = `The median full-distance IRONMAN finish time is ${formatTime(stats.finish.medianSeconds)}, based on ${stats.finisherCount.toLocaleString()} finishers. See averages by age group, gender, and year, plus swim, bike, and run splits.`;

  return {
    title,
    description,
    alternates: { canonical: "/stats/average-ironman-time" },
    openGraph: { title, description, url: "/stats/average-ironman-time" },
  };
}

export default function AverageIronmanTimePage() {
  return (
    <AverageTimeArticle
      distance="140.6"
      fullLabel="IRONMAN"
      altLabel="the full 140.6-mile distance"
      courseDescription="A full IRONMAN covers a 2.4-mile (3.8 km) swim, a 112-mile (180 km) bike, and a 26.2-mile (42.2 km) marathon."
      cutoffText="17 hours"
      other={{
        href: "/stats/average-half-ironman-time",
        label: "Average IRONMAN 70.3 (half Ironman) finish time",
      }}
    />
  );
}
