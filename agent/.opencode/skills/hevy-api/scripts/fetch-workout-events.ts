import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

const API_BASE = "https://api.hevyapp.com/v1";
const API_KEY = process.env.HEVY_API_KEY;

interface WorkoutSet {
  index: number;
  type: string;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
}

interface WorkoutExercise {
  index: number;
  title: string;
  notes: string;
  exercise_template_id: string;
  supersets_id: number | null;
  sets: WorkoutSet[];
}

interface Workout {
  id: string;
  title: string;
  routine_id: string | null;
  description: string;
  start_time: string;
  end_time: string;
  updated_at: string;
  created_at: string;
  exercises: WorkoutExercise[];
}

interface WorkoutEvent {
  type: "updated" | "deleted";
  workout?: Workout;
  id?: string;
  deleted_at?: string;
}

interface EventsResponse {
  page: number;
  page_count: number;
  events: WorkoutEvent[];
}

function parseArgs(): { since: string } {
  const sinceArg = process.argv.slice(2).find((a) => a.startsWith("--since="));
  const since = sinceArg ? sinceArg.slice("--since=".length) : "1970-01-01T00:00:00Z";
  return { since };
}

async function fetchWorkoutEvents(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const { since } = parseArgs();
  const allEvents: WorkoutEvent[] = [];
  let page = 1;
  let hasMore = true;

  try {
    while (hasMore) {
      const url = `${API_BASE}/workouts/events?page=${page}&pageSize=10&since=${encodeURIComponent(since)}`;
      const response = await fetch(url, {
        headers: {
          "api-key": API_KEY,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          JSON.stringify({
            error: `API request failed: ${response.status}`,
            details: errorText,
          }),
        );
        process.exit(1);
      }

      const data: EventsResponse = await response.json();
      allEvents.push(...data.events);

      hasMore = page < data.page_count;
      page++;
    }

    console.log(JSON.stringify(allEvents, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to fetch workout events",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

fetchWorkoutEvents();
