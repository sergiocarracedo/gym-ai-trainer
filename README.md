# Gym AI Trainer

An AI-powered personal gym trainer that analyzes your workout history from [Hevy](https://hevy.com) and provides personalized training recommendations.

## Features

- **Personalized Profile**: Stores your physical background, training experience, injuries, and preferences
- **Goal Tracking**: Set measurable monthly goals and track progress (e.g., "Bench Press: 3x8 @ 60kg → 3x10 @ 70kg")
- **Smart Recommendations**: Get suggestions for progressive overload, deloads, and routine adjustments
- **Recovery Guidance**: Recommends rest or training based on days since last workout
- **Multi-language Support**: Communicates in your preferred language

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [OpenCode](https://opencode.ai/) CLI installed
- Hevy account (API key or browser export)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-trainer.git
cd ai-trainer

# Install dependencies
npm install

# Start the trainer
./start.sh
# or
npm start
```

## First Run

On your first session, the agent will:

1. **Ask for Hevy access**: Either provide your API key or use browser-based CSV export
2. **Ask your preferred language**: All future communication will be in this language
3. **Collect your profile**:
   - Personal info (age, gender, weight, height)
   - Training background (experience level, previous sports)
   - Health considerations (injuries, medical conditions)
   - Schedule (available days, session duration)
4. **Help set training goals**: Measurable targets with deadlines

## Data Access Options

### Option 1: Hevy API Key (Recommended)

If you have a Hevy API key, the agent will store it in `.env` and use it for real-time workout data.

### Option 2: CSV Export

If you don't have an API key, the agent can guide you through exporting your workout data via the browser:
1. Requires [browser-mcp](https://github.com/anthropics/browser-mcp) to be installed
2. Navigates to https://hevy.com/settings?export
3. Parses the downloaded CSV file

## Project Structure

```
ai-trainer/
├── .env                    # Your Hevy API key (gitignored)
├── .opencode/
│   ├── agents/
│   │   └── gym-ai-trainer.md   # Agent definition
│   └── skills/
│       ├── hevy-api/           # API-based data access
│       └── hevy-export/        # Browser CSV export fallback
├── data/                   # Your personal data (gitignored)
│   ├── user.md             # Your profile
│   ├── goals.md            # Training goals
│   ├── workouts.json       # Cached workout data
│   └── conversation.md     # Session history
└── start.sh                # Launch script
```

## What the Agent Does

### Analyzes Your Training
- Fetches recent workouts from Hevy
- Calculates volume, weight, and rep trends per exercise
- Identifies plateaus and regression

### Provides Recommendations
- **Progressive overload**: When to increase weight or reps
- **Deload suggestions**: When RPE is consistently high
- **Rest recommendations**: Based on days since last workout
- **Goal adjustments**: If targets are too easy or too hard

### Tracks Progress
- Compares current performance to monthly goals
- Motivates you when ahead, suggests adjustments when behind
- Celebrates achievements

## Privacy

All your personal data stays local:
- `.env` (API key) is gitignored
- `data/` directory (profile, goals, workouts) is gitignored
- No data is sent anywhere except to Hevy's API (for fetching your own workouts)

## Configuration

The agent is configured via `opencode.json`. By default, it disables the standard `build` and `plan` agents so only the gym trainer is available.

To use alongside other agents, modify `opencode.json`:

```json
{
  "agent": {
    "build": { "disable": false },
    "plan": { "disable": false }
  }
}
```

## Development

### Code Quality Tools

This project uses:
- **[oxlint](https://oxc.rs/docs/guide/usage/linter.html)**: Fast JavaScript/TypeScript linter
- **[oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)**: Fast JavaScript/TypeScript formatter  
- **[lefthook](https://github.com/evilmartians/lefthook)**: Git hooks manager
- **[gitleaks](https://github.com/gitleaks/gitleaks)**: Secret detection in commits

### Available Scripts

```bash
# Lint TypeScript files
npm run lint
npm run lint:fix    # Auto-fix issues

# Format TypeScript files
npm run format       # Fix formatting
npm run format:check # Check formatting

# Type checking
npm run typecheck
```

### Pre-commit Hooks

Lefthook automatically runs on every commit:
1. **Linting** - oxlint checks for code issues
2. **Formatting** - oxfmt ensures consistent style
3. **Type checking** - TypeScript compiler validates types
4. **Secret detection** - gitleaks scans for accidentally committed secrets

To skip hooks (not recommended):
```bash
git commit --no-verify -m "message"
```

## License

MIT
