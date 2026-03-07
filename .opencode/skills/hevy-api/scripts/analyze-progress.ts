import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

interface HevySet {
  index: number;
  type: string;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
}

interface HevyExercise {
  title: string;
  sets: HevySet[];
}

interface HevyWorkout {
  id: string;
  title: string;
  start_time: string;
  exercises: HevyExercise[];
}

interface ExerciseSession {
  date: string;
  sets: HevySet[];
  totalVolume: number;
  maxWeight: number;
  totalReps: number;
  estimated1RM: number;
}

interface ProgressAnalysis {
  exercise: string;
  sessions: ExerciseSession[];
  trends: {
    volumeTrend: "increasing" | "stable" | "decreasing";
    weightTrend: "increasing" | "stable" | "decreasing";
    repsTrend: "increasing" | "stable" | "decreasing";
    estimated1RMTrend: "increasing" | "stable" | "decreasing";
  };
  summary: {
    totalSessions: number;
    avgVolume: number;
    maxWeightEver: number;
    currentEstimated1RM: number;
    volumeChange: number;
    weightChange: number;
  };
}

function parseArgs(): { exercise: string } {
  const args = process.argv.slice(2);
  let exercise = "";

  for (const arg of args) {
    if (arg.startsWith("--exercise=")) {
      exercise = arg.split("=").slice(1).join("=").replace(/^["']|["']$/g, "");
    }
  }

  if (!exercise) {
    console.error(
      JSON.stringify({ error: 'Missing required argument: --exercise="Exercise Name"' })
    );
    process.exit(1);
  }

  return { exercise };
}

function calculate1RM(weight: number, reps: number): number {
  // Brzycki formula
  if (reps === 1) return weight;
  return weight * (36 / (37 - reps));
}

function calculateTrend(values: number[]): "increasing" | "stable" | "decreasing" {
  if (values.length < 2) return "stable";

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (changePercent > 5) return "increasing";
  if (changePercent < -5) return "decreasing";
  return "stable";
}

async function analyzeProgress(exerciseName: string): Promise<void> {
  const workoutsPath = resolve(process.cwd(), "data", "workouts.json");

  if (!existsSync(workoutsPath)) {
    console.error(
      JSON.stringify({
        error: "No workouts data found. Run fetch-workouts.ts first.",
      })
    );
    process.exit(1);
  }

  const workouts: HevyWorkout[] = JSON.parse(
    readFileSync(workoutsPath, "utf-8")
  );

  const exerciseSessions: ExerciseSession[] = [];
  const normalizedName = exerciseName.toLowerCase();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.title.toLowerCase().includes(normalizedName)) {
        const workingSets = exercise.sets.filter(
          (s) => s.type === "normal" && s.weight_kg && s.reps
        );

        if (workingSets.length === 0) continue;

        const totalVolume = workingSets.reduce(
          (sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0),
          0
        );
        const maxWeight = Math.max(...workingSets.map((s) => s.weight_kg || 0));
        const totalReps = workingSets.reduce((sum, s) => sum + (s.reps || 0), 0);

        // Find best set for 1RM estimation
        const estimated1RMs = workingSets.map((s) =>
          calculate1RM(s.weight_kg || 0, s.reps || 1)
        );
        const estimated1RM = Math.max(...estimated1RMs);

        exerciseSessions.push({
          date: workout.start_time,
          sets: workingSets,
          totalVolume,
          maxWeight,
          totalReps,
          estimated1RM,
        });
      }
    }
  }

  if (exerciseSessions.length === 0) {
    console.error(
      JSON.stringify({
        error: `No data found for exercise: ${exerciseName}`,
        suggestion: "Check the exercise name matches your Hevy data",
      })
    );
    process.exit(1);
  }

  // Sort by date (oldest first for trend analysis)
  exerciseSessions.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const volumes = exerciseSessions.map((s) => s.totalVolume);
  const weights = exerciseSessions.map((s) => s.maxWeight);
  const reps = exerciseSessions.map((s) => s.totalReps);
  const e1rms = exerciseSessions.map((s) => s.estimated1RM);

  const analysis: ProgressAnalysis = {
    exercise: exerciseName,
    sessions: exerciseSessions,
    trends: {
      volumeTrend: calculateTrend(volumes),
      weightTrend: calculateTrend(weights),
      repsTrend: calculateTrend(reps),
      estimated1RMTrend: calculateTrend(e1rms),
    },
    summary: {
      totalSessions: exerciseSessions.length,
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      maxWeightEver: Math.max(...weights),
      currentEstimated1RM: e1rms[e1rms.length - 1],
      volumeChange:
        exerciseSessions.length > 1
          ? ((volumes[volumes.length - 1] - volumes[0]) / volumes[0]) * 100
          : 0,
      weightChange:
        exerciseSessions.length > 1
          ? ((weights[weights.length - 1] - weights[0]) / weights[0]) * 100
          : 0,
    },
  };

  console.log(JSON.stringify(analysis, null, 2));
}

const { exercise } = parseArgs();
analyzeProgress(exercise);
