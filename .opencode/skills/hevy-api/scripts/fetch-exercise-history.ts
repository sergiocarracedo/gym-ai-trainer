import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

const API_BASE = "https://api.hevyapp.com/v1";
const API_KEY = process.env.HEVY_API_KEY;

interface ExerciseHistoryEntry {
  workout_id: string;
  workout_title: string;
  workout_start_time: string;
  workout_end_time: string;
  exercise_template_id: string;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
  set_type: string;
}

function parseArgs(): {
  templateId: string;
  startDate: string | null;
  endDate: string | null;
} | null {
  const args = process.argv.slice(2);
  const idArg = args.find((a) => a.startsWith("--id="));
  const startArg = args.find((a) => a.startsWith("--start="));
  const endArg = args.find((a) => a.startsWith("--end="));

  if (!idArg) {
    console.error(
      JSON.stringify({
        error: "Missing required argument",
        usage:
          "npx tsx fetch-exercise-history.ts --id=<exerciseTemplateId> [--start=<ISO8601>] [--end=<ISO8601>]",
        example:
          "npx tsx fetch-exercise-history.ts --id=05293BCA --start=2024-01-01T00:00:00Z --end=2024-12-31T23:59:59Z",
      }),
    );
    return null;
  }

  return {
    templateId: idArg.slice("--id=".length).trim(),
    startDate: startArg ? startArg.slice("--start=".length).trim() : null,
    endDate: endArg ? endArg.slice("--end=".length).trim() : null,
  };
}

async function fetchExerciseHistory(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const args = parseArgs();
  if (!args) {
    process.exit(1);
  }

  const { templateId, startDate, endDate } = args;

  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const queryString = params.toString() ? `?${params.toString()}` : "";

  try {
    const response = await fetch(`${API_BASE}/exercise_history/${templateId}${queryString}`, {
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

    const data: { exercise_history: ExerciseHistoryEntry[] } = await response.json();
    console.log(JSON.stringify(data.exercise_history, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to fetch exercise history",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

fetchExerciseHistory();
