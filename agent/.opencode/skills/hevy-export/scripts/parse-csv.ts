import { resolve } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";

interface CsvRow {
  date: string;
  workoutName: string;
  exerciseName: string;
  setOrder: number;
  weightKg: number | null;
  reps: number | null;
  distanceM: number | null;
  durationS: number | null;
  notes: string;
  rpe: number | null;
}

interface HevySet {
  index: number;
  type: "normal";
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
  superset_id: null;
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

function parseArgs(): { file: string } {
  const args = process.argv.slice(2);
  let file = "";

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      file = arg
        .split("=")
        .slice(1)
        .join("=")
        .replace(/^["']|["']$/g, "");
    }
  }

  if (!file) {
    console.error(
      JSON.stringify({
        error: 'Missing required argument: --file="/path/to/hevy_export.csv"',
      }),
    );
    process.exit(1);
  }

  return { file };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // Skip header
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 5) continue;

    rows.push({
      date: values[0] || "",
      workoutName: values[1] || "",
      exerciseName: values[2] || "",
      setOrder: parseInt(values[3], 10) || 0,
      weightKg: values[4] ? parseFloat(values[4]) : null,
      reps: values[5] ? parseInt(values[5], 10) : null,
      distanceM: values[6] ? parseFloat(values[6]) : null,
      durationS: values[7] ? parseFloat(values[7]) : null,
      notes: values[8] || "",
      rpe: values[9] ? parseFloat(values[9]) : null,
    });
  }

  return rows;
}

function convertToHevyFormat(rows: CsvRow[]): HevyWorkout[] {
  const workoutMap = new Map<string, HevyWorkout>();

  for (const row of rows) {
    // Create unique workout key from date + name
    const workoutKey = `${row.date}_${row.workoutName}`;

    if (!workoutMap.has(workoutKey)) {
      // Parse date - assuming format like "2024-01-15 10:30:00" or similar
      const startTime = new Date(row.date).toISOString();

      workoutMap.set(workoutKey, {
        id: `csv_${workoutKey.replace(/[^a-zA-Z0-9]/g, "_")}`,
        title: row.workoutName,
        description: "",
        start_time: startTime,
        end_time: startTime, // CSV doesn't have end time
        exercises: [],
      });
    }

    const workout = workoutMap.get(workoutKey)!;

    // Find or create exercise
    let exercise = workout.exercises.find((e) => e.title === row.exerciseName);

    if (!exercise) {
      exercise = {
        index: workout.exercises.length,
        title: row.exerciseName,
        exercise_template_id: `csv_${row.exerciseName.replace(/[^a-zA-Z0-9]/g, "_")}`,
        superset_id: null,
        notes: row.notes,
        sets: [],
      };
      workout.exercises.push(exercise);
    }

    // Add set
    exercise.sets.push({
      index: row.setOrder - 1,
      type: "normal",
      weight_kg: row.weightKg,
      reps: row.reps,
      distance_meters: row.distanceM,
      duration_seconds: row.durationS,
      rpe: row.rpe,
    });

    // Append notes if this set has different notes
    if (row.notes && !exercise.notes.includes(row.notes)) {
      exercise.notes = exercise.notes ? `${exercise.notes}; ${row.notes}` : row.notes;
    }
  }

  // Convert map to array and sort by date descending
  const workouts = Array.from(workoutMap.values());
  workouts.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  return workouts;
}

async function parseCsvFile(): Promise<void> {
  const { file } = parseArgs();
  const filePath = resolve(file);

  if (!existsSync(filePath)) {
    console.error(
      JSON.stringify({
        error: `File not found: ${filePath}`,
      }),
    );
    process.exit(1);
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const rows = parseCsv(content);

    if (rows.length === 0) {
      console.error(
        JSON.stringify({
          error: "No data found in CSV file",
        }),
      );
      process.exit(1);
    }

    const workouts = convertToHevyFormat(rows);

    // Save to data/workouts.json
    const outputPath = resolve(process.cwd(), "data", "workouts.json");
    writeFileSync(outputPath, JSON.stringify(workouts, null, 2));

    console.log(
      JSON.stringify({
        success: true,
        message: `Parsed ${rows.length} sets from ${workouts.length} workouts`,
        outputPath,
        workouts,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to parse CSV",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

parseCsvFile();
