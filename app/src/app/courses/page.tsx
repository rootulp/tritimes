import { getCourseStats } from "@/lib/data";
import CourseCharts from "./course-charts";

export const metadata = {
  title: "IRONMAN & 70.3 Course Difficulty",
  description:
    "Which IRONMAN courses are fastest? Compare IRONMAN and IRONMAN 70.3 course difficulty based on median finish times across all race editions.",
  alternates: { canonical: "/courses" },
};

export default function CoursesPage() {
  const courses = getCourseStats();

  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Course Difficulty</h1>
        <p className="text-gray-400 mt-1">
          The 10 fastest courses per discipline, ranked by median time. Select any course to see all
          of its races.
        </p>
      </header>
      <CourseCharts courses={courses} />
    </main>
  );
}
