import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

const API_BASE = "https://api.hevyapp.com/v1";
const API_KEY = process.env.HEVY_API_KEY;

interface RoutineFolder {
  id: number;
  index: number;
  title: string;
  updated_at: string;
  created_at: string;
}

function parseArgs(): { title: string } | null {
  const titleArg = process.argv.slice(2).find((a) => a.startsWith("--title="));
  if (!titleArg) {
    console.error(
      JSON.stringify({
        error: "Missing required argument",
        usage: 'npx tsx create-routine-folder.ts --title="Folder Name"',
      }),
    );
    return null;
  }
  const title = titleArg.slice("--title=".length).trim();
  if (!title) {
    console.error(JSON.stringify({ error: "--title cannot be empty" }));
    return null;
  }
  return { title };
}

async function createRoutineFolder(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const args = parseArgs();
  if (!args) {
    process.exit(1);
  }

  try {
    const response = await fetch(`${API_BASE}/routine_folders`, {
      method: "POST",
      headers: {
        "api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ routine_folder: { title: args.title } }),
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

    const created: RoutineFolder = await response.json();
    console.log(JSON.stringify(created, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to create routine folder",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

createRoutineFolder();
