---
name: hevy-api
description: Interact with Hevy fitness API to fetch workouts, routines, and exercise data. Requires HEVY_API_KEY in .env file. Use when analyzing training history, checking recent workouts, or preparing training recommendations.
---

# Hevy API Skill

This skill provides access to the Hevy fitness tracking API for reading workout data.

## Prerequisites

This skill requires a Hevy API key stored in `.env`:

```
HEVY_API_KEY=your-api-key-here
```

### Getting an API Key

If the user doesn't have an API key:
1. Ask if they have one
2. If yes: ask them to provide it, then write to `.env`
3. If no: suggest using the `hevy-export` skill instead (CSV export via browser)

## Available Scripts

All scripts are TypeScript and should be run with `npx tsx` from the project root:

### Fetch Workouts

```bash
npx tsx .opencode/skills/hevy-api/scripts/fetch-workouts.ts [--days=N] [--limit=N]
```

Fetches recent workouts. Options:
- `--days=N`: Fetch workouts from last N days (default: 30)
- `--limit=N`: Maximum number of workouts to return (default: 50)

Returns JSON array of workouts with exercises, sets, reps, and weights.

### Fetch Routines

```bash
npx tsx .opencode/skills/hevy-api/scripts/fetch-routines.ts
```

Fetches all user routines and their exercise templates.

### Analyze Progress

```bash
npx tsx .opencode/skills/hevy-api/scripts/analyze-progress.ts --exercise="Exercise Name"
```

Analyzes progress for a specific exercise over time. Returns:
- Volume trends
- Weight progression
- Rep improvements
- Estimated 1RM changes

### Check Goal Progress

```bash
npx tsx .opencode/skills/hevy-api/scripts/check-goal-progress.ts
```

Compares recent workout performance against goals defined in `data/goals.md`.
Returns progress percentage and recommendations for each goal.

### Suggest Updates

```bash
npx tsx .opencode/skills/hevy-api/scripts/suggest-updates.ts
```

Analyzes recent performance and suggests routine modifications:
- Weight increases for exercises with consistent performance
- Rep range adjustments
- Exercise substitutions for plateaus

### Create Routine

```bash
npx tsx .opencode/skills/hevy-api/scripts/create-routine.ts --routine=<json>
```

Creates a new routine in Hevy via `POST /routines`. The `--routine` argument must be a JSON object with:
- `title` (string, required): Name of the routine
- `folder_id` (string | null, optional): Folder to place the routine in
- `exercises` (array, optional): List of exercises, each with:
  - `index` (number): Order position
  - `exercise_template_id` (string): ID from `GET /exercise_templates`
  - `superset_id` (string | null): Group exercises into a superset
  - `notes` (string): Per-exercise notes
  - `sets` (array): Each set needs `index`, `type`, `weight_kg`, `reps`

Returns the created routine object as JSON. Use `fetch-routines.ts` and `GET /exercise_templates` to look up valid IDs first.

### Update Routine

```bash
npx tsx .opencode/skills/hevy-api/scripts/update-routine.ts --id=<routineId> --routine=<json>
```

Updates an existing routine in Hevy via `PUT /routines/{id}`. Requires:
- `--id`: The routine ID (obtain from `fetch-routines.ts`)
- `--routine`: Full routine JSON (same shape as `create-routine.ts`) — replaces the entire routine

Returns the updated routine object as JSON.

## Output Format

All scripts output JSON to stdout. Parse the output to use in recommendations.

## Error Handling

Scripts will exit with code 1 and print error JSON if:
- API key is missing
- API request fails
- Invalid parameters provided

## API Reference

See [references/HEVY-API.md](references/HEVY-API.md) for full API documentation.
