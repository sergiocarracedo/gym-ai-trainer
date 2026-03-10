import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

const API_BASE = "https://api.hevyapp.com/v1";
const API_KEY = process.env.HEVY_API_KEY;

interface HevySet {
  index: number;
  type: "normal" | "warmup" | "drop" | "failure";
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
}

interface HevyExercise {
  index: number;
  title: string;
  exercise_template_id: string;
  superset_id: string | null;
  notes: string;
  sets: HevySet[];
}

interface HevyWorkout {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  exercises: HevyExercise[];
}

interface WorkoutsResponse {
  page: number;
  page_count: number;
  workouts: HevyWorkout[];
}

function parseArgs(): { days: number; limit: number } {
  const args = process.argv.slice(2);
  let days = 30;
  let limit = 50;

  for (const arg of args) {
    if (arg.startsWith("--days=")) {
      days = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    }
  }

  return { days, limit };
}

async function fetchWorkouts(days: number, limit: number): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const allWorkouts: HevyWorkout[] = [];
  let page = 1;
  let hasMore = true;

  try {
    while (hasMore && allWorkouts.length < limit) {
      const response = await fetch(`${API_BASE}/workouts?page=${page}&pageSize=10`, {
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

      const data: WorkoutsResponse = await response.json();

      for (const workout of data.workouts) {
        const workoutDate = new Date(workout.start_time);
        if (workoutDate >= cutoffDate && allWorkouts.length < limit) {
          allWorkouts.push(workout);
        }
      }

      hasMore = page < data.page_count;
      page++;

      // Check if oldest workout in this page is before cutoff
      if (data.workouts.length > 0) {
        const oldestInPage = new Date(data.workouts[data.workouts.length - 1].start_time);
        if (oldestInPage < cutoffDate) {
          hasMore = false;
        }
      }
    }

    // Save to data/workouts.json for caching
    const outputPath = resolve(process.cwd(), "data", "workouts.json");
    writeFileSync(outputPath, JSON.stringify(allWorkouts, null, 2));

    // Output to stdout for agent consumption
    console.log(JSON.stringify(allWorkouts, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to fetch workouts",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

const { days, limit } = parseArgs();
fetchWorkouts(days, limit);
