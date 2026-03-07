import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

const API_BASE = "https://api.hevyapp.com/v1";
const API_KEY = process.env.HEVY_API_KEY;

interface ExerciseTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  is_custom: boolean;
}

interface ExerciseTemplatesResponse {
  page: number;
  page_count: number;
  exercise_templates: ExerciseTemplate[];
}

function parseArgs(): { templateId: string | null } {
  const idArg = process.argv.slice(2).find((a) => a.startsWith("--id="));
  return { templateId: idArg ? idArg.slice("--id=".length).trim() : null };
}

async function fetchExerciseTemplates(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  const { templateId } = parseArgs();

  try {
    // Single template by ID
    if (templateId) {
      const response = await fetch(`${API_BASE}/exercise_templates/${templateId}`, {
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

    // Paginated fetch of all templates
    const allTemplates: ExerciseTemplate[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`${API_BASE}/exercise_templates?page=${page}&pageSize=100`, {
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

      const data: ExerciseTemplatesResponse = await response.json();
      allTemplates.push(...data.exercise_templates);

      hasMore = page < data.page_count;
      page++;
    }

    // Save to data/exercise_templates.json for caching
    const outputPath = resolve(process.cwd(), "data", "exercise_templates.json");
    writeFileSync(outputPath, JSON.stringify(allTemplates, null, 2));

    console.log(JSON.stringify(allTemplates, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to fetch exercise templates",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

fetchExerciseTemplates();
