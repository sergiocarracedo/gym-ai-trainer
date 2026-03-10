import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

const API_BASE = "https://api.hevyapp.com/v1";
const API_KEY = process.env.HEVY_API_KEY;

function parseArgs(): { routineId: string } | null {
  const idArg = process.argv.slice(2).find((a) => a.startsWith("--id="));
  if (!idArg) {
    console.error(
      JSON.stringify({
        error: "Missing required argument",
        usage: "npx tsx fetch-routine.ts --id=<routineId>",
      }),
    );
    return null;
  }
  return { routineId: idArg.slice("--id=".length).trim() };
}

async function fetchRoutine(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const args = parseArgs();
  if (!args) {
    process.exit(1);
  }

  try {
    const response = await fetch(`${API_BASE}/routines/${args.routineId}`, {
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

    const data = await response.json();
    // Unwrap the routine envelope if present
    const routine = data.routine ?? data;
    console.log(JSON.stringify(routine, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to fetch routine",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

fetchRoutine();
