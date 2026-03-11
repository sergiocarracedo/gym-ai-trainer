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

### Running Locally (Development)

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-trainer.git
cd ai-trainer

# Install dependencies
npm install

# Start the trainer
cd agent && ./start.sh
# or from repo root
npm start
```

### Running in Docker

```bash
# Set up environment (see docker/.env.example)
cp docker/.env.example docker/.env
# Edit docker/.env with your Discord credentials

# Start the container
docker-compose -f docker/docker-compose.yml up -d

# Interact via Discord bot
# Use /opencode commands in your Discord server
```

### Running as Home Assistant Addon

The easiest way to run Gym AI Trainer 24/7 is as a Home Assistant addon:

1. **Add the repository** to Home Assistant:
   - Go to Settings → Add-ons → Add-on Store → ⋮ (top right) → Repositories
   - Add: `https://github.com/sergiocarracedo/gym-ai-trainer`

2. **Install the addon**:
   - Find "Gym AI Trainer" in the Add-on Store
   - Click Install

3. **Configure**:
   - **Discord Bot Setup** (see [Discord Bot Setup](#discord-bot-setup) below):
     - Bot Token
     - Application ID  
     - Server ID
     - Channel ID
     - Allowed User IDs (optional)
   - **API Keys**:
     - Anthropic API Key (get from [console.anthropic.com](https://console.anthropic.com/settings/keys))
     - Hevy API Key (from Hevy app settings)

4. **Start the addon** and interact via Discord

Your profile, goals, and workout data are automatically backed up with Home Assistant snapshots.

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
ai-trainer/                      # Repo root (development environment)
├── agent/                       # The gym-ai-trainer "product"
│   ├── .opencode/
│   │   ├── agents/
│   │   │   └── gym-ai-trainer.md   # Agent definition
│   │   ├── plugins/
│   │   │   └── conversation-log.ts # Auto-logs conversations
│   │   └── skills/
│   │       ├── hevy-api/           # API-based data access
│   │       └── hevy-export/        # Browser CSV export fallback
│   ├── data/                   # Your personal data (gitignored)
│   │   ├── user.md             # Your profile
│   │   ├── goals.md            # Training goals
│   │   ├── workouts.json       # Cached workout data
│   │   └── conversation.md     # Session history
│   ├── .env                    # Agent secrets (gitignored)
│   ├── opencode.json           # Agent-only config
│   └── start.sh                # Local launcher
├── base/                        # Git submodule: agents-ha-base
│   ├── simple-bot.js           # Discord bot with slash commands
│   ├── entrypoint.sh           # HA + standalone mode detection
│   ├── ha-addon/               # Shared HA addon components
│   └── scripts/                # Build utilities
├── docker/                      # Standalone Docker infrastructure
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── entrypoint.sh
│   └── .env.example            # Discord bot credentials template
├── gym-ai-trainer/              # Home Assistant addon files
│   ├── config.yaml             # Generated (base + agent config merged)
│   ├── config.agent.yaml       # Agent-specific HA config
│   ├── Dockerfile              # HA addon build instructions
│   ├── build.yaml              # Architecture support
│   └── translations/           # UI translations
├── docs/
│   └── plans/
├── repository.json              # HA addon repository metadata
├── package.json                # Dev tooling + HA build script
├── tsconfig.json
├── lefthook.yml
└── README.md
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

## Two OpenCode Environments

This project uses two separate OpenCode configurations:

1. **Development Environment** (repo root): Use your preferred coding assistant (OpenCode, Claude Code, etc.) to develop and iterate on the agent code. No restrictions.

2. **Production Agent** (`agent/`): The locked-down gym trainer that only runs the gym-ai-trainer agent with specific skills. This is what runs in Docker.

## Privacy

All your personal data stays local:
- `agent/.env` (API key) is gitignored
- `agent/data/` directory (profile, goals, workouts) is gitignored
- No data is sent anywhere except to Hevy's API (for fetching your own workouts)

## Legal Disclaimer

- This project provides fitness guidance for informational and educational purposes only.
- It is **not** medical advice, diagnosis, or treatment.
- Always consult a qualified healthcare professional before making medical, rehabilitation, or significant training decisions.
- If you feel pain, dizziness, or any concerning symptoms, stop and seek professional care.
- AI outputs can be incorrect or incomplete; use your own judgment and professional guidance.

## Discord Bot Setup

To use the Discord bot interface (required for Docker and Home Assistant deployments):

1. **Create a Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name (e.g., "Gym AI Trainer")
   - Copy the **Application ID** from General Information

2. **Create a Bot**:
   - Go to Bot tab → "Reset Token" → Copy the **Bot Token**
   - Enable these Privileged Gateway Intents:
     - Server Members Intent
     - Message Content Intent

3. **Invite to Server**:
   - Go to OAuth2 → URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Read Message History`, `Use Slash Commands`, `Manage Threads`
   - Copy the generated URL and open it in your browser to invite the bot

4. **Get IDs** (enable Developer Mode in Discord Settings → Advanced):
   - Right-click your server icon → Copy Server ID (**Server ID**)
   - Right-click the channel where bot should listen → Copy Channel ID (**Channel ID**)
   - (Optional) Right-click users → Copy User ID (**Allowed User IDs**)

## Running via Discord (Docker)

The Docker setup integrates [remote-opencode](https://github.com/RoundTable02/remote-opencode), enabling Discord bot control:

1. Set up Discord credentials in `docker/.env` (see `docker/.env.example`)
2. Start the container: `docker-compose -f docker/docker-compose.yml up -d`
3. Use Discord slash commands to interact:
   - `/opencode prompt:Analyze my last workout`
   - `/setpath`, `/use`, `/projects`, etc.

The agent's `.env` (with `HEVY_API_KEY`) and `data/` are bind-mounted, so the agent can read/write them as needed.

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
