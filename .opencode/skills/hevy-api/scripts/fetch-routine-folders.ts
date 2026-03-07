import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

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

interface RoutineFoldersResponse {
  page: number;
  page_count: number;
  routine_folders: RoutineFolder[];
}

function parseArgs(): { folderId: string | null } {
  const idArg = process.argv.slice(2).find((a) => a.startsWith("--id="));
  return { folderId: idArg ? idArg.slice("--id=".length).trim() : null };
}

async function fetchRoutineFolders(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const { folderId } = parseArgs();

  try {
    // Single folder by ID
    if (folderId) {
      const response = await fetch(`${API_BASE}/routine_folders/${folderId}`, {
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
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // Paginated fetch of all folders
    const allFolders: RoutineFolder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`${API_BASE}/routine_folders?page=${page}&pageSize=10`, {
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

      const data: RoutineFoldersResponse = await response.json();
      allFolders.push(...data.routine_folders);

      hasMore = page < data.page_count;
      page++;
    }

    // Save to data/routine_folders.json for caching
    const outputPath = resolve(process.cwd(), "data", "routine_folders.json");
    writeFileSync(outputPath, JSON.stringify(allFolders, null, 2));

    console.log(JSON.stringify(allFolders, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to fetch routine folders",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

fetchRoutineFolders();
