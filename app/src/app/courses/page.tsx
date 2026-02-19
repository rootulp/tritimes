import { getCourseStats } from "@/lib/data";
import CourseCharts from "./course-charts";

export const metadata = {
  title: "Course Difficulty | TriTimes",
  description:
    "Compare IRONMAN and IRONMAN 70.3 course difficulty based on median finish times across all race editions.",
};

export default function CoursesPage() {
  const courses = getCourseStats();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Course Difficulty</h1>
        <p className="text-gray-400 mt-1">
          Courses ranked by median time — fastest at the top, slowest at the
          bottom.
        </p>
      </header>
      <CourseCharts courses={courses} />
    </main>
  );
}
