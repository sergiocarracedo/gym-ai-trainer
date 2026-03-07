# Gym AI Trainer - Design Document

**Date**: 2026-03-07  
**Status**: Implemented

## Overview

An OpenCode agent that helps users optimize their gym training by:
- Analyzing workout history from Hevy
- Providing personalized recommendations based on user profile
- Setting and tracking measurable goals
- Suggesting progressive overload and recovery strategies

## User Requirements

### Data Access
- **Primary**: Hevy API with user-provided API key
- **Fallback**: CSV export via browser-mcp when no API key available

### User Profile (`data/user.md`)
Agent collects on first interaction:
- Preferred language (asked first, used throughout)
- Personal info: name, age, gender, weight (kg), height (cm)
- Physical background: experience level, previous sports, fitness level
- Health: injuries, medical conditions, mobility limitations
- Schedule: available days, session duration, equipment access

### Goals (`data/goals.md`)
- General training goal (suggested based on profile)
- Measurable monthly goals with targets and deadlines
- Progress tracking with motivation

### Training Intelligence
- Progressive overload suggestions
- Periodization planning
- Recovery recommendations based on days since last workout
- Date-aware session planning

### Constraints
- Read-only access to Hevy data (never modify workouts)
- Full conversation logging in `data/conversation.md`

---

## Project Structure

```
ai-trainer/
├── .env                          # HEVY_API_KEY
├── .env.example                  # Template for .env
├── .gitignore
├── package.json
├── tsconfig.json
├── opencode.json
├── start.sh                      # Launch script
├── .opencode/
│   ├── agents/
│   │   └── gym-ai-trainer.md     # Primary agent definition
│   └── skills/
│       ├── hevy-api/             # API-based data access
│       │   ├── SKILL.md
│       │   ├── scripts/
│       │   │   ├── fetch-workouts.ts
│       │   │   ├── fetch-routines.ts
│       │   │   ├── analyze-progress.ts
│       │   │   ├── check-goal-progress.ts
│       │   │   └── suggest-updates.ts
│       │   └── references/
│       │       └── HEVY-API.md
│       └── hevy-export/          # Browser-based CSV export
│           ├── SKILL.md
│           └── scripts/
│               └── parse-csv.ts
├── data/                         # User data (gitignored)
│   └── .gitkeep
└── docs/
    └── plans/
        └── 2026-03-07-gym-ai-trainer-design.md
```

---

## Agent Behavior Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     SESSION START                           │
├─────────────────────────────────────────────────────────────┤
│ 0. Check .env for HEVY_API_KEY                              │
│    ├─ Missing → Ask user for key or offer CSV fallback      │
│    └─ Present → Continue                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Check data/user.md                                       │
│    ├─ Missing → Ask preferred language FIRST                │
│    │            Then collect full profile                   │
│    │            Save to data/user.md                        │
│    └─ Present → Load profile, use stored language           │
├─────────────────────────────────────────────────────────────┤
│ 2. Check data/goals.md                                      │
│    ├─ Missing → Suggest goals based on profile              │
│    │            Help set measurable monthly targets         │
│    │            Save to data/goals.md                       │
│    └─ Present → Load goals                                  │
├─────────────────────────────────────────────────────────────┤
│ 3. Regular Session                                          │
│    a. Run `date` for current date context                   │
│    b. Fetch recent workouts from Hevy                       │
│    c. Calculate days since last workout                     │
│    d. Compare performance to goals                          │
│    e. Recommend: rest, push, or next workout                │
│    f. Log conversation to data/conversation.md              │
└─────────────────────────────────────────────────────────────┘
```

---

## Skills

### hevy-api

Primary skill for API-based access to Hevy data.

**Scripts:**
- `fetch-workouts.ts` - Fetch recent workouts with pagination
- `fetch-routines.ts` - Fetch all user routines
- `analyze-progress.ts` - Calculate trends for specific exercise
- `check-goal-progress.ts` - Compare workouts to goals.md targets
- `suggest-updates.ts` - Generate routine modification suggestions

### hevy-export

Fallback skill for browser-based CSV export when no API key is available.

**Requirements:** browser-mcp installed

**Scripts:**
- `parse-csv.ts` - Convert Hevy CSV export to JSON format

---

## Key Features

| Feature | Implementation |
|---------|----------------|
| User profile collection | Agent prompts on first run, stores in `user.md` |
| Language preference | Asked first, used for all communication |
| Goal setting | Suggested based on profile, measurable with deadlines |
| Progress tracking | Scripts analyze Hevy data vs goals |
| Rest/push recommendations | Based on days since last workout + performance |
| Date awareness | `date` command for current context |
| Conversation memory | Full log in `conversation.md` |
| Read-only for Hevy | Agent can only fetch, never modify workout data |
| API key management | Stored in `.env`, asked if missing |
| CSV fallback | Browser automation when no API key |

---

## Usage

### Quick Start

```bash
./start.sh
```

Or:

```bash
npm install
npm start
```

### First Run

1. Agent checks for API key, asks if missing
2. Agent asks for preferred language
3. Agent collects user profile
4. Agent helps set training goals
5. Regular sessions begin

---

## Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.11.0"
  },
  "dependencies": {
    "dotenv": "^16.4.0"
  }
}
```
