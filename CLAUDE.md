# CLAUDE.md — deadline_reader

This file provides guidance for AI coding assistants (Claude Code and similar tools) working in this repository.

---

## Project Overview

**deadline_reader** is a Discord bot that:
1. Monitors specified Discord channels for image attachments
2. Sends the image to the Claude API (vision) to extract event/deadline information
3. Adds the extracted event to Google Calendar automatically

**Stack**: Node.js · Discord.js v14 · Anthropic SDK · Google Calendar API (googleapis)

---

## Repository Structure

```
deadline_reader/
├── CLAUDE.md
├── package.json
├── .env.example           # Required environment variable template
├── .gitignore
├── src/
│   ├── index.js           # Entry point: Discord bot setup and message handler
│   ├── extractor.js       # Claude Vision API — extracts event data from images
│   └── calendar.js        # Google Calendar API — creates calendar events
└── scripts/
    └── authorize.js       # One-time OAuth2 setup to obtain GOOGLE_REFRESH_TOKEN
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Discord bot token |
| `DISCORD_CHANNEL_IDS` | No | Comma-separated channel IDs to watch. Empty = all channels |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | Yes | Obtained by running `npm run authorize` |
| `GOOGLE_CALENDAR_ID` | No | Calendar ID (default: `primary`) |

---

## Commands

```bash
# Install dependencies
npm install

# First-time Google Calendar OAuth setup (run once)
npm run authorize

# Start the bot
npm start
```

---

## Setup Guide

### 1. Discord Bot
1. Create a bot at https://discord.com/developers/applications
2. Enable **Message Content Intent** under Bot settings
3. Invite the bot with scopes: `bot` + permissions: `Read Messages`, `Send Messages`, `Add Reactions`
4. Copy the bot token to `DISCORD_TOKEN`

### 2. Google Cloud Project
1. Create a project at https://console.cloud.google.com
2. Enable the **Google Calendar API**
3. Create OAuth2 credentials (type: Web application)
4. Add `http://localhost:3000` to Authorized redirect URIs
5. Copy Client ID and Secret to `.env`
6. Run `npm run authorize` to obtain `GOOGLE_REFRESH_TOKEN`

### 3. Anthropic API
1. Get an API key at https://console.anthropic.com
2. Copy to `ANTHROPIC_API_KEY`

---

## Data Flow

```
Discord message (image attachment)
  └─► src/index.js (MessageCreate handler)
        └─► src/extractor.js (Claude claude-sonnet-4-6 vision)
              └─► returns { title, date, startTime, endTime, location, description }
                    └─► src/calendar.js (Google Calendar events.insert)
                          └─► Discord reply with embed (event title, date, link)
```

### Claude Extraction Schema

`extractor.js` prompts Claude to return JSON:
```json
{
  "title": "string",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM | null",
  "endTime": "HH:MM | null",
  "location": "string | null",
  "description": "string | null"
}
```
If no event info is found, Claude returns `{"error": "..."}` and the bot replies with a friendly error.

### Calendar Event Rules
- If `startTime` is present → timed event (`dateTime`), end defaults to start + 1 hour if `endTime` is null
- If `startTime` is null → all-day event (`date`)
- Timezone: `Asia/Tokyo`

---

## Development Workflow

### Git

```bash
# Branch naming
feature/<short-description>      # new features
fix/<short-description>          # bug fixes
claude/<description>-<id>        # Claude Code tasks

# Push with upstream tracking
git push -u origin <branch-name>
```

**Rules:**
- Never force-push `main`/`master`
- Never skip pre-commit hooks (`--no-verify`)
- Never commit `.env` or credentials

---

## Code Conventions

- **Runtime**: Node.js ≥ 18
- **Style**: CommonJS (`require`/`module.exports`)
- **Line length**: 100 characters max
- **No TypeScript**: plain JavaScript for simplicity
- **Error handling**: catch and log errors; reply to the Discord message with a Japanese error message

---

## AI Assistant Guidelines

1. **Read before editing** — always read a file before modifying it.
2. **Minimal changes** — make only what was asked; don't refactor surrounding code.
3. **No speculative abstractions** — don't add helpers or config for hypothetical future use.
4. **Security** — never log API keys; avoid command injection.
5. **Test coverage** — if tests are added later, one test file per source module in `tests/`.
6. **Update this file** — if you change the structure, stack, or conventions, update CLAUDE.md.
7. **Confirm before destructive actions** — deleting files or resetting branches requires user confirmation.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-10 | Initial implementation: Discord bot + Claude Vision + Google Calendar |
