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

interface UpdateRoutineInput {
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
      usage: "npx tsx update-routine.ts --id=<routineId> --routine=<json>",
      example: {
        id: "ROUTINE_ID",
        routine: {
          title: "Push Day (Updated)",
          folder_id: null,
          exercises: [
            {
              index: 0,
              exercise_template_id: "TEMPLATE_ID",
              superset_id: null,
              notes: "",
              sets: [{ index: 0, type: "normal", weight_kg: 80, reps: 10 }],
            },
          ],
        },
      },
    }),
  );
}

function parseArgs(): { id: string; routine: UpdateRoutineInput } | null {
  const args = process.argv.slice(2);
  const idArg = args.find((a) => a.startsWith("--id="));
  const routineArg = args.find((a) => a.startsWith("--routine="));

  if (!idArg || !routineArg) {
    printUsage();
    return null;
  }

  const id = idArg.slice("--id=".length).trim();
  if (!id) {
    console.error(JSON.stringify({ error: "--id cannot be empty" }));
    return null;
  }

  try {
    const routine = JSON.parse(routineArg.slice("--routine=".length)) as UpdateRoutineInput;
    return { id, routine };
  } catch {
    console.error(JSON.stringify({ error: "Failed to parse --routine JSON" }));
    return null;
  }
}

async function updateRoutine(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const args = parseArgs();
  if (!args) {
    process.exit(1);
  }

  const { id, routine } = args;

  if (!routine.title || routine.title.trim() === "") {
    console.error(JSON.stringify({ error: "Routine title is required" }));
    process.exit(1);
  }

  try {
    const response = await fetch(`${API_BASE}/routines/${id}`, {
      method: "PUT",
      headers: {
        "api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ routine }),
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

    const updated: HevyRoutine = await response.json();
    console.log(JSON.stringify(updated, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to update routine",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

updateRoutine();
