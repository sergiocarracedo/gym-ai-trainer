---
name: hevy-api
description: Interact with Hevy fitness API to fetch workouts, routines, exercise data, and more. Requires HEVY_API_KEY in .env file. Use when analyzing training history, checking recent workouts, exploring exercise history, or managing routines and folders.
---

# Hevy API Skill

This skill provides full access to the Hevy fitness tracking API.

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

All scripts are TypeScript and should be run with `npx tsx` from the project root.

---

### Workouts

#### Fetch Workouts

```bash
npx tsx .opencode/skills/hevy-api/scripts/fetch-workouts.ts [--days=N] [--limit=N]
```

Fetches recent workouts with full exercise and set data.
- `--days=N`: Workouts from last N days (default: 30)
- `--limit=N`: Max workouts to return (default: 50)

Saves to `data/workouts.json` and outputs JSON array.

#### Fetch Workout Count

```bash
npx tsx .opencode/skills/hevy-api/scripts/fetch-workout-count.ts
```

Returns the total number of workouts on the account: `{ "workout_count": 42 }`.

#### Fetch Workout Events

```bash
npx tsx .opencode/skills/hevy-api/scripts/fetch-workout-events.ts [--since=<ISO8601>]
```

Returns paginated workout events (updates or deletes) since a given date.
Use to keep a local cache up to date without re-fetching all workouts.
- `--since`: ISO 8601 date (default: `1970-01-01T00:00:00Z`)

Returns a JSON array of events, each with `type: "updated" | "deleted"` and either a full workout object or `{ id, deleted_at }`.

---

### Users

#### Fetch User Info

```bash
npx tsx .opencode/skills/hevy-api/scripts/fetch-user-info.ts
```

Returns the authenticated user's profile: `{ id, name, url }`.

---

### Routines

#### Fetch Routines (all)

```bash
npx tsx .opencode/skills/hevy-api/scripts/fetch-routines.ts
```

Fetches all user routines with full exercise and set data. Saves to `data/routines.json`.

#### Fetch Routine (single)

```bash
npx tsx .opencode/skills/hevy-api/scripts/fetch-routine.ts --id=<routineId>
```

Fetches a single routine by ID.

#### Create Routine

```bash
npx tsx .opencode/skills/hevy-api/scripts/create-routine.ts --routine=<json>
```

Creates a new routine via `POST /routines`. The `--routine` JSON must include:
- `title` (required)
- `folder_id` (optional integer)
- `notes` (optional)
- `exercises[]` — each with `exercise_template_id`, `rest_seconds`, `notes`, `sets[]`
- Each set: `type`, `weight_kg`, `reps`, `distance_meters`, `duration_seconds`, `custom_metric`, `rep_range: { start, end }`

Returns the created routine.

#### Update Routine

```bash
npx tsx .opencode/skills/hevy-api/scripts/update-routine.ts --id=<routineId> --routine=<json>
```

Replaces an existing routine via `PUT /routines/{id}`. Same JSON shape as Create Routine.
- `--id`: Routine ID (from Fetch Routines)
- `--routine`: Full routine JSON

Returns the updated routine.

---

### Exercise Templates

#### Fetch Exercise Templates (all or single)

```bash
# All templates (cached to data/exercise_templates.json)
npx tsx .opencode/skills/hevy-api/scripts/fetch-exercise-templates.ts

# Single template by ID
npx tsx .opencode/skills/hevy-api/scripts/fetch-exercise-templates.ts --id=<templateId>
```

Lists available exercise templates (built-in + custom). Use to look up `exercise_template_id` values when building routines.
- `pageSize` is 100 per page (max allowed), so most accounts fetch in 1-2 pages.

Each template: `{ id, title, type, primary_muscle_group, secondary_muscle_groups, is_custom }`.

#### Create Custom Exercise Template

```bash
npx tsx .opencode/skills/hevy-api/scripts/create-exercise-template.ts --exercise=<json>
```

Creates a new custom exercise template via `POST /exercise_templates`. The `--exercise` JSON:
- `title` (required)
- `exercise_type`: one of `weight_reps`, `bodyweight_reps`, `weighted_bodyweight`, `assisted_bodyweight`, `duration`, `distance_duration`, `weight_distance`, `weight_duration`
- `equipment_category`: `barbell`, `dumbbell`, `cable`, `machine`, `smith_machine`, `ez_bar`, `trap_bar`, `kettlebell`, `plate`, `resistance_band`, `suspension`, `other`, `none`
- `muscle_group`: primary muscle group
- `other_muscles`: array of secondary muscle groups

Returns `{ id: <newId> }`.

---

### Routine Folders

#### Fetch Routine Folders (all or single)

```bash
# All folders (cached to data/routine_folders.json)
npx tsx .opencode/skills/hevy-api/scripts/fetch-routine-folders.ts

# Single folder by ID
npx tsx .opencode/skills/hevy-api/scripts/fetch-routine-folders.ts --id=<folderId>
```

Lists routine folders. Each folder: `{ id, index, title, updated_at, created_at }`.

#### Create Routine Folder

```bash
npx tsx .opencode/skills/hevy-api/scripts/create-routine-folder.ts --title="Folder Name"
```

Creates a new routine folder at index 0 (all others shift). Returns the created folder.

---

### Exercise History

#### Fetch Exercise History

```bash
npx tsx .opencode/skills/hevy-api/scripts/fetch-exercise-history.ts --id=<exerciseTemplateId> [--start=<ISO8601>] [--end=<ISO8601>]
```

Fetches all historical sets logged for a specific exercise (by template ID).
- `--id`: Exercise template ID (required — get from `fetch-exercise-templates.ts`)
- `--start`: Filter from date (e.g. `2024-01-01T00:00:00Z`)
- `--end`: Filter to date (e.g. `2024-12-31T23:59:59Z`)

Returns a JSON array of entries: `{ workout_id, workout_title, workout_start_time, workout_end_time, exercise_template_id, weight_kg, reps, distance_meters, duration_seconds, rpe, custom_metric, set_type }`.

---

### Analysis

#### Analyze Progress

```bash
npx tsx .opencode/skills/hevy-api/scripts/analyze-progress.ts --exercise="Exercise Name"
```

Analyzes progress for a specific exercise over time. Returns volume trends, weight progression, rep improvements, and estimated 1RM changes (Brzycki formula).

#### Check Goal Progress

```bash
npx tsx .opencode/skills/hevy-api/scripts/check-goal-progress.ts
```

Compares recent workout performance against goals in `data/goals.md`. Returns progress percentage and recommendations.

#### Suggest Updates

```bash
npx tsx .opencode/skills/hevy-api/scripts/suggest-updates.ts
```

Analyzes recent performance and suggests progressive overload, deload, or plateau-breaking changes.

---

## Output Format

All scripts output JSON to stdout. Parse the output to use in recommendations.

## Error Handling

Scripts exit with code 1 and print error JSON if:
- API key is missing
- API request fails
- Invalid parameters provided

## API Reference

See [references/HEVY-API.md](references/HEVY-API.md) for full API documentation.
