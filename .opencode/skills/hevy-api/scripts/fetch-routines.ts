import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

const API_BASE = "https://api.hevyapp.com/v1";
const API_KEY = process.env.HEVY_API_KEY;

interface RoutineSet {
  index: number;
  type: "normal" | "warmup" | "drop" | "failure";
  weight_kg: number | null;
  reps: number | null;
}

interface RoutineExercise {
  index: number;
  title: string;
  exercise_template_id: string;
  superset_id: string | null;
  notes: string;
  sets: RoutineSet[];
}

interface HevyRoutine {
  id: string;
  title: string;
  folder_id: string | null;
  exercises: RoutineExercise[];
}

interface RoutinesResponse {
  page: number;
  page_count: number;
  routines: HevyRoutine[];
}

async function fetchRoutines(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const allRoutines: HevyRoutine[] = [];
  let page = 1;
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await fetch(
        `${API_BASE}/routines?page=${page}&pageSize=50`,
        {
          headers: {
            "api-key": API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          JSON.stringify({
            error: `API request failed: ${response.status}`,
            details: errorText,
          })
        );
        process.exit(1);
      }

      const data: RoutinesResponse = await response.json();
      allRoutines.push(...data.routines);

      hasMore = page < data.page_count;
      page++;
    }

    // Save to data/routines.json for caching
    const outputPath = resolve(process.cwd(), "data", "routines.json");
    writeFileSync(outputPath, JSON.stringify(allRoutines, null, 2));

    // Output to stdout for agent consumption
    console.log(JSON.stringify(allRoutines, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to fetch routines",
        details: error instanceof Error ? error.message : String(error),
      })
    );
    process.exit(1);
  }
}

fetchRoutines();
