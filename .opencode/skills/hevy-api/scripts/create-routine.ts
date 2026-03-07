import { config } from "dotenv";
import { resolve } from "path";

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

interface RoutineExerciseInput {
  index: number;
  exercise_template_id: string;
  superset_id: string | null;
  notes: string;
  sets: RoutineSet[];
}

interface CreateRoutineInput {
  title: string;
  folder_id?: string | null;
  exercises: RoutineExerciseInput[];
}

interface HevyRoutine {
  id: string;
  title: string;
  folder_id: string | null;
  exercises: Array<RoutineExerciseInput & { title: string }>;
}

function printUsage(): void {
  console.error(
    JSON.stringify({
      error: "Invalid usage",
      usage: "npx tsx create-routine.ts --routine=<json>",
      example: {
        routine: {
          title: "Push Day",
          folder_id: null,
          exercises: [
            {
              index: 0,
              exercise_template_id: "TEMPLATE_ID",
              superset_id: null,
              notes: "",
              sets: [{ index: 0, type: "normal", weight_kg: null, reps: null }],
            },
          ],
        },
      },
    }),
  );
}

function parseArgs(): CreateRoutineInput | null {
  const routineArg = process.argv.slice(2).find((a) => a.startsWith("--routine="));

  if (!routineArg) {
    printUsage();
    return null;
  }

  try {
    return JSON.parse(routineArg.slice("--routine=".length)) as CreateRoutineInput;
  } catch {
    console.error(JSON.stringify({ error: "Failed to parse --routine JSON" }));
    return null;
  }
}

async function createRoutine(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const input = parseArgs();
  if (!input) {
    process.exit(1);
  }

  if (!input.title || input.title.trim() === "") {
    console.error(JSON.stringify({ error: "Routine title is required" }));
    process.exit(1);
  }

  try {
    const response = await fetch(`${API_BASE}/routines`, {
      method: "POST",
      headers: {
        "api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ routine: input }),
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

    const created: HevyRoutine = await response.json();
    console.log(JSON.stringify(created, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to create routine",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

createRoutine();
