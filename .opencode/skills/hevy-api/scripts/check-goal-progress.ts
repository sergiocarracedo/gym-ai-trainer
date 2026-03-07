import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

interface HevySet {
  type: string;
  weight_kg: number | null;
  reps: number | null;
}

interface HevyExercise {
  title: string;
  sets: HevySet[];
}

interface HevyWorkout {
  start_time: string;
  exercises: HevyExercise[];
}

interface Goal {
  exercise: string;
  currentSets: number;
  currentReps: number;
  currentWeight: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  deadline: string;
}

interface GoalProgress {
  exercise: string;
  goal: Goal;
  latestPerformance: {
    date: string;
    sets: number;
    avgReps: number;
    maxWeight: number;
  } | null;
  progress: {
    setsProgress: number;
    repsProgress: number;
    weightProgress: number;
    overallProgress: number;
  };
  status: "ahead" | "on_track" | "behind" | "no_data";
  daysRemaining: number;
  recommendation: string;
}

function parseGoalsMd(content: string): Goal[] {
  const goals: Goal[] = [];
  const lines = content.split("\n");

  let inTable = false;
  for (const line of lines) {
    if (line.includes("| Exercise |")) {
      inTable = true;
      continue;
    }
    if (line.includes("|---")) continue;
    if (!inTable) continue;
    if (!line.startsWith("|")) {
      inTable = false;
      continue;
    }

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c);
    if (cells.length < 5) continue;

    // Parse: Exercise | Current | Target | Deadline | Status
    const exercise = cells[0];
    const currentMatch = cells[1].match(/(\d+)x(\d+)\s*@\s*(\d+(?:\.\d+)?)/);
    const targetMatch = cells[2].match(/(\d+)x(\d+)\s*@\s*(\d+(?:\.\d+)?)/);
    const deadline = cells[3];

    if (currentMatch && targetMatch) {
      goals.push({
        exercise,
        currentSets: parseInt(currentMatch[1], 10),
        currentReps: parseInt(currentMatch[2], 10),
        currentWeight: parseFloat(currentMatch[3]),
        targetSets: parseInt(targetMatch[1], 10),
        targetReps: parseInt(targetMatch[2], 10),
        targetWeight: parseFloat(targetMatch[3]),
        deadline,
      });
    }
  }

  return goals;
}

function findLatestExerciseData(
  workouts: HevyWorkout[],
  exerciseName: string,
): { date: string; sets: number; avgReps: number; maxWeight: number } | null {
  const normalizedName = exerciseName.toLowerCase();

  // Sort workouts by date descending
  const sorted = [...workouts].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );

  for (const workout of sorted) {
    for (const exercise of workout.exercises) {
      if (exercise.title.toLowerCase().includes(normalizedName)) {
        const workingSets = exercise.sets.filter(
          (s) => s.type === "normal" && s.weight_kg && s.reps,
        );

        if (workingSets.length === 0) continue;

        const avgReps = workingSets.reduce((sum, s) => sum + (s.reps || 0), 0) / workingSets.length;
        const maxWeight = Math.max(...workingSets.map((s) => s.weight_kg || 0));

        return {
          date: workout.start_time,
          sets: workingSets.length,
          avgReps: Math.round(avgReps * 10) / 10,
          maxWeight,
        };
      }
    }
  }

  return null;
}

function calculateProgress(current: number, start: number, target: number): number {
  if (target === start) return current >= target ? 100 : 0;
  const progress = ((current - start) / (target - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

async function checkGoalProgress(): Promise<void> {
  const goalsPath = resolve(process.cwd(), "data", "goals.md");
  const workoutsPath = resolve(process.cwd(), "data", "workouts.json");

  if (!existsSync(goalsPath)) {
    console.error(
      JSON.stringify({
        error: "No goals.md found. Goals need to be set first.",
      }),
    );
    process.exit(1);
  }

  if (!existsSync(workoutsPath)) {
    console.error(
      JSON.stringify({
        error: "No workouts data found. Run fetch-workouts.ts first.",
      }),
    );
    process.exit(1);
  }

  const goalsContent = readFileSync(goalsPath, "utf-8");
  const workouts: HevyWorkout[] = JSON.parse(readFileSync(workoutsPath, "utf-8"));

  const goals = parseGoalsMd(goalsContent);

  if (goals.length === 0) {
    console.log(
      JSON.stringify({
        message: "No measurable goals found in goals.md",
        hint: "Goals should be in a table format: | Exercise | Current | Target | Deadline | Status |",
      }),
    );
    return;
  }

  const today = new Date();
  const progressReports: GoalProgress[] = [];

  for (const goal of goals) {
    const latest = findLatestExerciseData(workouts, goal.exercise);
    const deadlineDate = new Date(goal.deadline);
    const daysRemaining = Math.ceil(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let progress = { setsProgress: 0, repsProgress: 0, weightProgress: 0, overallProgress: 0 };
    let status: GoalProgress["status"] = "no_data";
    let recommendation =
      "No recent data for this exercise. Try completing a workout with this exercise.";

    if (latest) {
      progress = {
        setsProgress: calculateProgress(latest.sets, goal.currentSets, goal.targetSets),
        repsProgress: calculateProgress(latest.avgReps, goal.currentReps, goal.targetReps),
        weightProgress: calculateProgress(latest.maxWeight, goal.currentWeight, goal.targetWeight),
        overallProgress: 0,
      };
      progress.overallProgress = Math.round(
        (progress.setsProgress + progress.repsProgress + progress.weightProgress) / 3,
      );

      // Determine status based on time remaining and progress
      const expectedProgress = Math.max(0, 100 - (daysRemaining / 30) * 100); // Assuming 30-day goals

      if (progress.overallProgress >= 100) {
        status = "ahead";
        recommendation = "Goal achieved! Consider setting a new target.";
      } else if (progress.overallProgress >= expectedProgress - 10) {
        status = "on_track";
        recommendation = "Good progress! Keep up the current pace.";
      } else {
        status = "behind";
        if (progress.weightProgress < progress.repsProgress) {
          recommendation = "Focus on increasing weight slightly each session.";
        } else {
          recommendation = "Try adding 1-2 more reps per set to catch up.";
        }
      }
    }

    progressReports.push({
      exercise: goal.exercise,
      goal,
      latestPerformance: latest,
      progress,
      status,
      daysRemaining,
      recommendation,
    });
  }

  console.log(JSON.stringify(progressReports, null, 2));
}

checkGoalProgress();
