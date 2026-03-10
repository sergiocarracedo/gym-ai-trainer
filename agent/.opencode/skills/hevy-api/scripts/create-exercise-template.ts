import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

const API_BASE = "https://api.hevyapp.com/v1";
const API_KEY = process.env.HEVY_API_KEY;

type ExerciseType =
  | "weight_reps"
  | "bodyweight_reps"
  | "weighted_bodyweight"
  | "assisted_bodyweight"
  | "duration"
  | "distance_duration"
  | "weight_distance"
  | "weight_duration";

type EquipmentCategory =
  | "barbell"
  | "dumbbell"
  | "cable"
  | "machine"
  | "smith_machine"
  | "ez_bar"
  | "trap_bar"
  | "kettlebell"
  | "plate"
  | "resistance_band"
  | "suspension"
  | "other"
  | "none";

type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "cardio"
  | "other";

interface CreateExerciseTemplateInput {
  title: string;
  exercise_type: ExerciseType;
  equipment_category: EquipmentCategory;
  muscle_group: MuscleGroup;
  other_muscles: MuscleGroup[];
}

function printUsage(): void {
  console.error(
    JSON.stringify({
      error: "Invalid usage",
      usage: "npx tsx create-exercise-template.ts --exercise=<json>",
      example: {
        exercise: {
          title: "Cable Fly",
          exercise_type: "weight_reps",
          equipment_category: "cable",
          muscle_group: "chest",
          other_muscles: ["shoulders", "triceps"],
        },
      },
    }),
  );
}

function parseArgs(): CreateExerciseTemplateInput | null {
  const exerciseArg = process.argv.slice(2).find((a) => a.startsWith("--exercise="));

  if (!exerciseArg) {
    printUsage();
    return null;
  }

  try {
    return JSON.parse(exerciseArg.slice("--exercise=".length)) as CreateExerciseTemplateInput;
  } catch {
    console.error(JSON.stringify({ error: "Failed to parse --exercise JSON" }));
    return null;
  }
}

async function createExerciseTemplate(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const input = parseArgs();
  if (!input) {
    process.exit(1);
  }

  if (!input.title || input.title.trim() === "") {
    console.error(JSON.stringify({ error: "Exercise title is required" }));
    process.exit(1);
  }

  try {
    const response = await fetch(`${API_BASE}/exercise_templates`, {
      method: "POST",
      headers: {
        "api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ exercise: input }),
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

    const created = await response.json();
    console.log(JSON.stringify(created, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to create exercise template",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

createExerciseTemplate();
