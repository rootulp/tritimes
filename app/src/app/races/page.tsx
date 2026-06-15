import { getRaces } from "@/lib/races";
import RaceList from "./race-list";

export const revalidate = false;

export default function RacesPage() {
  const races = getRaces();

  return (
    <main className="max-w-6xl w-full mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">All Races</h1>
      <RaceList races={races} />
    </main>
  );
}
