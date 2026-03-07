import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(process.cwd(), ".env") });

const API_BASE = "https://api.hevyapp.com/v1";
const API_KEY = process.env.HEVY_API_KEY;

interface UserInfo {
  id: string;
  name: string;
  url: string;
}

async function fetchUserInfo(): Promise<void> {
  if (!API_KEY) {
    console.error(JSON.stringify({ error: "HEVY_API_KEY not found in .env" }));
    process.exit(1);
  }

  try {
    const response = await fetch(`${API_BASE}/user/info`, {
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

    const data: { data: UserInfo } = await response.json();
    console.log(JSON.stringify(data.data, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify({
        error: "Failed to fetch user info",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
}

fetchUserInfo();
