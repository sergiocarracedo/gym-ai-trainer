# Hevy API Reference

Base URL: `https://api.hevyapp.com/v1`

## Authentication

All requests require the `api-key` header:

```
api-key: your-api-key-here
```

## Endpoints

### Workouts

#### GET /workouts

Fetch user workouts with pagination.

**Query Parameters:**

- `page` (integer): Page number (default: 1)
- `pageSize` (integer): Items per page (default: 10, max: 10)

**Response:**

```json
{
  "page": 1,
  "page_count": 5,
  "workouts": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "start_time": "2024-01-15T10:30:00Z",
      "end_time": "2024-01-15T11:45:00Z",
      "exercises": [
        {
          "index": 0,
          "title": "Bench Press (Barbell)",
          "exercise_template_id": "string",
          "superset_id": null,
          "notes": "string",
          "sets": [
            {
              "index": 0,
              "type": "normal",
              "weight_kg": 80,
              "reps": 10,
              "distance_meters": null,
              "duration_seconds": null,
              "rpe": 8
            }
          ]
        }
      ]
    }
  ]
}
```

#### GET /workouts/{workoutId}

Fetch a specific workout by ID.

### Routines

#### GET /routines

Fetch all user routines.

**Query Parameters:**

- `page` (integer): Page number (default: 1)
- `pageSize` (integer): Items per page (default: 10)

**Response:**

```json
{
  "page": 1,
  "page_count": 1,
  "routines": [
    {
      "id": "string",
      "title": "Push Day",
      "folder_id": null,
      "exercises": [
        {
          "index": 0,
          "title": "Bench Press (Barbell)",
          "exercise_template_id": "string",
          "superset_id": null,
          "notes": "",
          "sets": [
            {
              "index": 0,
              "type": "normal",
              "weight_kg": null,
              "reps": null
            }
          ]
        }
      ]
    }
  ]
}
```

### Exercise Templates

#### GET /exercise_templates

Fetch available exercise templates.

**Query Parameters:**

- `page` (integer): Page number
- `pageSize` (integer): Items per page

**Response:**

```json
{
  "page": 1,
  "page_count": 10,
  "exercise_templates": [
    {
      "id": "string",
      "title": "Bench Press (Barbell)",
      "type": "weight_reps",
      "primary_muscle_group": "chest",
      "secondary_muscle_groups": ["triceps", "shoulders"],
      "is_custom": false
    }
  ]
}
```

### Routine Folders

#### GET /routine_folders

Fetch routine folders for organization.

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
- `distance`: Distance-based exercises
- `weight_duration`: Weight with time

## Muscle Groups

Primary muscle groups:

- chest, back, shoulders, biceps, triceps, forearms
- core, quadriceps, hamstrings, glutes, calves, cardio, other

## Rate Limits

- 100 requests per minute per API key
- Pagination recommended for large datasets

## Error Responses

```json
{
  "error": "string",
  "message": "string"
}
```

Common status codes:

- 401: Invalid or missing API key
- 404: Resource not found
- 429: Rate limit exceeded
- 500: Server error
