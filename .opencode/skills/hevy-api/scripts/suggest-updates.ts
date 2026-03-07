import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

interface HevySet {
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
  start_time: string;
  exercises: HevyExercise[];
}

interface ExerciseHistory {
  exercise: string;
  sessions: Array<{
    date: string;
    sets: number;
    avgReps: number;
    maxWeight: number;
    avgRPE: number | null;
  }>;
}

interface Suggestion {
  exercise: string;
  type: "increase_weight" | "increase_reps" | "deload" | "plateau_break" | "maintain";
  currentLevel: string;
  suggestedLevel: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

function analyzeExerciseHistory(
  workouts: HevyWorkout[],
  exerciseName: string,
  minSessions: number = 3
): ExerciseHistory | null {
  const normalizedName = exerciseName.toLowerCase();
  const sessions: ExerciseHistory["sessions"] = [];

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (exercise.title.toLowerCase() === normalizedName) {
        const workingSets = exercise.sets.filter(
          (s) => s.type === "normal" && s.weight_kg && s.reps
        );

        if (workingSets.length === 0) continue;

        const avgReps =
          workingSets.reduce((sum, s) => sum + (s.reps || 0), 0) /
          workingSets.length;
        const maxWeight = Math.max(...workingSets.map((s) => s.weight_kg || 0));
        const rpeSets = workingSets.filter((s) => s.rpe !== null);
        const avgRPE =
          rpeSets.length > 0
            ? rpeSets.reduce((sum, s) => sum + (s.rpe || 0), 0) / rpeSets.length
            : null;

        sessions.push({
          date: workout.start_time,
          sets: workingSets.length,
          avgReps: Math.round(avgReps * 10) / 10,
          maxWeight,
          avgRPE: avgRPE ? Math.round(avgRPE * 10) / 10 : null,
        });
      }
    }
  }

  if (sessions.length < minSessions) return null;

  // Sort by date (oldest first)
  sessions.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return { exercise: exerciseName, sessions };
}

function generateSuggestion(history: ExerciseHistory): Suggestion {
  const recent = history.sessions.slice(-3);
  const latest = recent[recent.length - 1];

  // Check for consistent performance (plateau detection)
  const weights = recent.map((s) => s.maxWeight);
  const reps = recent.map((s) => s.avgReps);

  const weightVariance =
    Math.max(...weights) - Math.min(...weights);
  const avgReps = reps.reduce((a, b) => a + b, 0) / reps.length;
  const latestWeight = latest.maxWeight;

  // Check RPE if available
  const avgRPE = recent
    .filter((s) => s.avgRPE !== null)
    .reduce((sum, s, _, arr) => sum + (s.avgRPE || 0) / arr.length, 0);

  // Decision logic
  if (avgRPE && avgRPE >= 9.5) {
    // Very high RPE - suggest deload
    return {
      exercise: history.exercise,
      type: "deload",
      currentLevel: `${latest.sets}x${latest.avgReps} @ ${latestWeight}kg`,
      suggestedLevel: `${latest.sets}x${latest.avgReps} @ ${Math.round(latestWeight * 0.85)}kg`,
      reasoning: `Average RPE of ${avgRPE.toFixed(1)} suggests fatigue. A deload week would help recovery.`,
      confidence: "high",
    };
  }

  if (weightVariance < 2.5 && avgReps >= 12) {
    // Stable weight, high reps - increase weight
    const newWeight = Math.round((latestWeight + 2.5) * 2) / 2; // Round to nearest 1.25
    return {
      exercise: history.exercise,
      type: "increase_weight",
      currentLevel: `${latest.sets}x${Math.round(avgReps)} @ ${latestWeight}kg`,
      suggestedLevel: `${latest.sets}x${Math.max(8, Math.round(avgReps) - 2)} @ ${newWeight}kg`,
      reasoning: `Consistently hitting ${Math.round(avgReps)} reps at ${latestWeight}kg. Ready for progressive overload.`,
      confidence: "high",
    };
  }

  if (weightVariance < 2.5 && avgReps >= 8 && avgReps < 12) {
    // Good rep range, try adding reps
    return {
      exercise: history.exercise,
      type: "increase_reps",
      currentLevel: `${latest.sets}x${Math.round(avgReps)} @ ${latestWeight}kg`,
      suggestedLevel: `${latest.sets}x${Math.round(avgReps) + 1} @ ${latestWeight}kg`,
      reasoning: `Solid performance at ${latestWeight}kg. Add 1 rep per set before increasing weight.`,
      confidence: "medium",
    };
  }

  if (weightVariance < 2.5 && history.sessions.length >= 5) {
    // Long plateau - suggest variation
    return {
      exercise: history.exercise,
      type: "plateau_break",
      currentLevel: `${latest.sets}x${Math.round(avgReps)} @ ${latestWeight}kg`,
      suggestedLevel: `Try: drop sets, pause reps, or tempo variation`,
      reasoning: `Performance has plateaued for ${history.sessions.length} sessions. Consider technique variations.`,
      confidence: "medium",
    };
  }

  // Default: maintain current approach
  return {
    exercise: history.exercise,
    type: "maintain",
    currentLevel: `${latest.sets}x${latest.avgReps} @ ${latestWeight}kg`,
    suggestedLevel: `${latest.sets}x${latest.avgReps} @ ${latestWeight}kg`,
    reasoning: "Performance is progressing well. Continue current approach.",
    confidence: "medium",
  };
}

async function suggestUpdates(): Promise<void> {
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

  // Get unique exercises from recent workouts
  const exerciseSet = new Set<string>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      exerciseSet.add(exercise.title);
    }
  }

  const suggestions: Suggestion[] = [];

  for (const exerciseName of exerciseSet) {
    const history = analyzeExerciseHistory(workouts, exerciseName);
    if (history) {
      suggestions.push(generateSuggestion(history));
    }
  }

  // Sort by confidence and type priority
  const typePriority: Record<Suggestion["type"], number> = {
    deload: 1,
    increase_weight: 2,
    increase_reps: 3,
    plateau_break: 4,
    maintain: 5,
  };

  suggestions.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === "high" ? -1 : 1;
    }
    return typePriority[a.type] - typePriority[b.type];
  });

  console.log(JSON.stringify(suggestions, null, 2));
}

suggestUpdates();
