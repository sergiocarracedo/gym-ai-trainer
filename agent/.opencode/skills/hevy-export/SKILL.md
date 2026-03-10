---
name: hevy-export
description: Export workout data from Hevy via browser automation when API key is not available. Requires browser-mcp to be installed. Use as fallback when user has no Hevy API key.
---

# Hevy Export Skill (Browser-based)

This skill provides an alternative way to get Hevy workout data when the user doesn't have an API key. It uses browser automation to download the CSV export from Hevy's settings page.

## Prerequisites

This skill requires the `browser-mcp` server to be installed and connected.

### Check if browser-mcp is available

Look for browser tools in your available tools list:
- `mcp_browsermcp_browser_navigate`
- `mcp_browsermcp_browser_click`
- `mcp_browsermcp_browser_snapshot`

### Installing browser-mcp

If browser-mcp is not available, guide the user to install it:

1. Add to their opencode config (`~/.config/opencode/opencode.json` or project `opencode.json`):

```json
{
  "mcp": {
    "browser-mcp": {
      "type": "npm",
      "package": "@anthropic/browser-mcp"
    }
  }
}
```

2. Restart opencode for changes to take effect

## Export Workflow

### Step 1: Navigate to Hevy Export Page

```
mcp_browsermcp_browser_navigate({ url: "https://hevy.com/settings?export" })
```

### Step 2: Handle Authentication

The user may need to log in first. Check the page snapshot:
- If login form is visible, guide user to log in manually
- Wait for them to confirm they're logged in

### Step 3: Find and Click Export Button

Use `mcp_browsermcp_browser_snapshot` to get the page structure, then find and click the export/download button.

### Step 4: Wait for Download

The export may take a moment. Wait for the download to complete.

### Step 5: Parse the CSV

Once downloaded, ask the user for the file path and run the parser:

```bash
npx tsx .opencode/skills/hevy-export/scripts/parse-csv.ts --file="/path/to/hevy_export.csv"
```

This converts the CSV to JSON and saves it to `data/workouts.json`.

## CSV Format

Hevy exports workouts in CSV format with columns:
- Date
- Workout Name
- Exercise Name
- Set Order
- Weight (kg)
- Reps
- Distance (m)
- Duration (s)
- Notes
- RPE

## Limitations vs API

| Feature | API | CSV Export |
|---------|-----|------------|
| Real-time data | Yes | No (manual export needed) |
| Routines | Yes | No |
| Exercise templates | Yes | No |
| Workout history | Yes | Yes |
| Automation | Full | Requires user interaction |

## Important Notes

When using CSV export:
1. Remind user to re-export periodically for fresh data
2. The agent cannot access routines - only workout history
3. Focus analysis on historical workout data only
4. Store the parsed data in `data/workouts.json` for consistency with API workflow
