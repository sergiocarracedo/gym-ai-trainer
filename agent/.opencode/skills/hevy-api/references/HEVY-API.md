# Hevy API Reference

Base URL: `https://api.hevyapp.com/v1`

## Authentication

All requests require the `api-key` header:

```
api-key: your-api-key-here
```

---

## Workouts

### GET /workouts

Fetch a paginated list of workouts.

**Query Parameters:**

- `page` (integer): Page number, must be ≥ 1 (default: 1)
- `pageSize` (integer): Items per page, max 10 (default: 5)

**Response:**

```json
{
  "page": 1,
  "page_count": 5,
  "workouts": [
    {
      "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
      "title": "Morning Workout",
      "routine_id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
      "description": "Pushed myself to the limit today!",
      "start_time": "2021-09-14T12:00:00Z",
      "end_time": "2021-09-14T12:00:00Z",
      "updated_at": "2021-09-14T12:00:00Z",
      "created_at": "2021-09-14T12:00:00Z",
      "exercises": [
        {
          "index": 0,
          "title": "Bench Press (Barbell)",
          "notes": "Paid closer attention to form today.",
          "exercise_template_id": "05293BCA",
          "supersets_id": 0,
          "sets": [
            {
              "index": 0,
              "type": "normal",
              "weight_kg": 100,
              "reps": 10,
              "distance_meters": null,
              "duration_seconds": null,
              "rpe": 9.5,
              "custom_metric": 50
            }
          ]
        }
      ]
    }
  ]
}
```

### GET /workouts/count

Get the total number of workouts on the account.

**Response:**

```json
{
  "workout_count": 42
}
```

### GET /workouts/events

Retrieve a paginated list of workout events (updates or deletes) since a given date.
Ordered newest to oldest. Use to keep a local cache up to date without fetching all workouts.

**Query Parameters:**

- `page` (integer): Page number, must be ≥ 1 (default: 1)
- `pageSize` (integer): Items per page, max 10 (default: 5)
- `since` (string, ISO 8601): Only return events after this date (default: `1970-01-01T00:00:00Z`)

**Response:**

```json
{
  "page": 1,
  "page_count": 5,
  "events": [
    {
      "type": "updated",
      "workout": {
        "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
        "title": "Morning Workout",
        "routine_id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
        "description": "Pushed myself to the limit today!",
        "start_time": "2021-09-14T12:00:00Z",
        "end_time": "2021-09-14T12:00:00Z",
        "updated_at": "2021-09-14T12:00:00Z",
        "created_at": "2021-09-14T12:00:00Z",
        "exercises": [
          {
            "index": 0,
            "title": "Bench Press (Barbell)",
            "notes": "Great session!",
            "exercise_template_id": "05293BCA",
            "supersets_id": 0,
            "sets": [
              {
                "index": 0,
                "type": "normal",
                "weight_kg": 100,
                "reps": 10,
                "distance_meters": null,
                "duration_seconds": null,
                "rpe": 9.5,
                "custom_metric": 50
              }
            ]
          }
        ]
      }
    },
    {
      "type": "deleted",
      "id": "efe6801c-4aee-4959-bcdd-fca3f272821b",
      "deleted_at": "2021-09-13T12:00:00Z"
    }
  ]
}
```

### GET /workouts/{workoutId}

Fetch a specific workout by ID.

**Path Parameters:**

- `workoutId` (string, required): The ID of the workout

**Response:** Single workout object (same shape as items in `GET /workouts`).

---

## Users

### GET /user/info

Get info about the authenticated user.

**Response:**

```json
{
  "data": {
    "id": "9c465af3-de7d-42bc-9c7c-f0170396358b",
    "name": "John Doe",
    "url": "https://hevy.com/user/john"
  }
}
```

---

## Routines

### GET /routines

Fetch a paginated list of routines.

**Query Parameters:**

- `page` (integer): Page number, must be ≥ 1 (default: 1)
- `pageSize` (integer): Items per page, max 10 (default: 5)

**Response:**

```json
{
  "page": 1,
  "page_count": 5,
  "routines": [
    {
      "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
      "title": "Upper Body",
      "folder_id": 42,
      "updated_at": "2021-09-14T12:00:00Z",
      "created_at": "2021-09-14T12:00:00Z",
      "exercises": [
        {
          "index": 0,
          "title": "Bench Press (Barbell)",
          "rest_seconds": "60",
          "notes": "Focus on form.",
          "exercise_template_id": "05293BCA",
          "supersets_id": 0,
          "sets": [
            {
              "index": 0,
              "type": "normal",
              "weight_kg": 100,
              "reps": 10,
              "rep_range": { "start": 8, "end": 12 },
              "distance_meters": null,
              "duration_seconds": null,
              "rpe": 9.5,
              "custom_metric": 50
            }
          ]
        }
      ]
    }
  ]
}
```

### GET /routines/{routineId}

Fetch a specific routine by ID.

**Path Parameters:**

- `routineId` (string, required): The ID of the routine

**Response:**

```json
{
  "routine": {
    "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
    "title": "Upper Body",
    "folder_id": 42,
    "updated_at": "2021-09-14T12:00:00Z",
    "created_at": "2021-09-14T12:00:00Z",
    "exercises": [ ... ]
  }
}
```

### POST /routines

Create a new routine.

**Request Body:**

```json
{
  "routine": {
    "title": "April Leg Day",
    "folder_id": null,
    "notes": "Focus on form over weight. Remember to stretch.",
    "exercises": [
      {
        "exercise_template_id": "D04AC939",
        "superset_id": null,
        "rest_seconds": 90,
        "notes": "Stay slow and controlled.",
        "sets": [
          {
            "type": "normal",
            "weight_kg": 100,
            "reps": 10,
            "distance_meters": null,
            "duration_seconds": null,
            "custom_metric": null,
            "rep_range": { "start": 8, "end": 12 }
          }
        ]
      }
    ]
  }
}
```

**Notes:**
- `exercise_template_id` must be a valid ID from `GET /exercise_templates`
- `title` is required
- `folder_id` is optional; use `GET /routine_folders` to list available folder IDs
- `rest_seconds` is optional per-exercise rest timer
- `rep_range` is optional; use to specify a target rep range instead of a fixed rep count
- Set `weight_kg` and `reps` to `null` to leave them unspecified

**Response:** `201 Created` — the created routine object (same shape as `GET /routines/{routineId}`).

### PUT /routines/{routineId}

Update an existing routine. Replaces the entire routine.

**Path Parameters:**

- `routineId` (string, required): The ID of the routine to update

**Request Body:** Same shape as `POST /routines` (without `folder_id` in PUT):

```json
{
  "routine": {
    "title": "April Leg Day (Updated)",
    "notes": "Focus on form over weight. Remember to stretch.",
    "exercises": [ ... ]
  }
}
```

**Response:** `200 OK` — the updated routine object.

---

## Exercise Templates

### GET /exercise_templates

Fetch a paginated list of exercise templates available on the account (built-in + custom).

**Query Parameters:**

- `page` (integer): Page number, must be ≥ 1 (default: 1)
- `pageSize` (integer): Items per page, max 100 (default: 5)

**Response:**

```json
{
  "page": 1,
  "page_count": 5,
  "exercise_templates": [
    {
      "id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
      "title": "Bench Press (Barbell)",
      "type": "weight_reps",
      "primary_muscle_group": "chest",
      "secondary_muscle_groups": ["triceps", "shoulders"],
      "is_custom": false
    }
  ]
}
```

### GET /exercise_templates/{exerciseTemplateId}

Fetch a specific exercise template by ID.

**Path Parameters:**

- `exerciseTemplateId` (string, required): The ID of the exercise template

**Response:** Single exercise template object (same shape as items in `GET /exercise_templates`).

### POST /exercise_templates

Create a new custom exercise template.

**Request Body:**

```json
{
  "exercise": {
    "title": "Bench Press",
    "exercise_type": "weight_reps",
    "equipment_category": "barbell",
    "muscle_group": "chest",
    "other_muscles": ["biceps", "triceps"]
  }
}
```

**Response:** `201 Created`

```json
{
  "id": 123
}
```

**Error Responses:**
- `400` — Invalid request body
- `403` — `exceeds-custom-exercise-limit` (account limit reached)

---

## Routine Folders

### GET /routine_folders

Fetch a paginated list of routine folders.

**Query Parameters:**

- `page` (integer): Page number, must be ≥ 1 (default: 1)
- `pageSize` (integer): Items per page, max 10 (default: 5)

**Response:**

```json
{
  "page": 1,
  "page_count": 5,
  "routine_folders": [
    {
      "id": 42,
      "index": 1,
      "title": "Push Pull",
      "updated_at": "2021-09-14T12:00:00Z",
      "created_at": "2021-09-14T12:00:00Z"
    }
  ]
}
```

### GET /routine_folders/{folderId}

Fetch a specific routine folder by ID.

**Path Parameters:**

- `folderId` (integer, required): The ID of the routine folder

**Response:** Single folder object (same shape as items in `GET /routine_folders`).

### POST /routine_folders

Create a new routine folder. The folder is created at index 0; all other folders have their indexes incremented.

**Request Body:**

```json
{
  "routine_folder": {
    "title": "Push Pull"
  }
}
```

**Response:** `201 Created`

```json
{
  "id": 42,
  "index": 1,
  "title": "Push Pull",
  "updated_at": "2021-09-14T12:00:00Z",
  "created_at": "2021-09-14T12:00:00Z"
}
```

---

## Exercise History

### GET /exercise_history/{exerciseTemplateId}

Fetch all historical sets logged for a specific exercise template.

**Path Parameters:**

- `exerciseTemplateId` (string, required): The ID of the exercise template

**Query Parameters:**

- `start_date` (string, ISO 8601, optional): Filter results from this date (e.g. `2024-01-01T00:00:00Z`)
- `end_date` (string, ISO 8601, optional): Filter results up to this date (e.g. `2024-12-31T23:59:59Z`)

**Response:**

```json
{
  "exercise_history": [
    {
      "workout_id": "b459cba5-cd6d-463c-abd6-54f8eafcadcb",
      "workout_title": "Morning Workout",
      "workout_start_time": "2024-01-01T12:00:00Z",
      "workout_end_time": "2024-01-01T13:00:00Z",
      "exercise_template_id": "D04AC939",
      "weight_kg": 100,
      "reps": 10,
      "distance_meters": null,
      "duration_seconds": null,
      "rpe": 8.5,
      "custom_metric": null,
      "set_type": "normal"
    }
  ]
}
```

---

## Set Types

- `normal`: Standard working set
- `warmup`: Warm-up set
- `drop`: Drop set
- `failure`: Set to failure

## Exercise Types

- `weight_reps`: Weight and repetitions (most common)
- `bodyweight_reps`: Bodyweight exercises with reps
- `weighted_bodyweight`: Bodyweight with added weight
- `assisted_bodyweight`: Assisted bodyweight (negative weight)
- `duration`: Time-based exercises
- `distance_duration`: Distance and duration
- `weight_distance`: Weight with distance
- `weight_duration`: Weight with time

## Equipment Categories

- `barbell`, `dumbbell`, `cable`, `machine`, `smith_machine`
- `ez_bar`, `trap_bar`, `kettlebell`, `plate`
- `resistance_band`, `suspension`, `other`, `none`

## Muscle Groups

Primary muscle groups:
- `chest`, `back`, `shoulders`, `biceps`, `triceps`, `forearms`
- `core`, `quadriceps`, `hamstrings`, `glutes`, `calves`, `cardio`, `other`

---

## Rate Limits

- 100 requests per minute per API key
- Pagination recommended for large datasets

## Error Responses

```json
{
  "error": "string"
}
```

Common status codes:

- `400`: Bad request / invalid body
- `401`: Invalid or missing API key
- `403`: Forbidden (e.g. exceeded custom exercise limit)
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Server error
