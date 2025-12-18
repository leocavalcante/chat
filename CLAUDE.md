# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
bun install          # Install dependencies
bun run start        # Build and run dev server on http://localhost:3000
```

The start command runs `server.ts` which:
1. Builds the React app via `Bun.build()` to `dist/index.js`
2. Compiles Tailwind CSS via `bunx @tailwindcss/cli` to `dist/styles.css`
3. Serves the app on port 3000

## Architecture

This is a personal chat client for Claude, built with React 19 and Bun.

**Key files:**
- `server.ts` - Bun HTTP server that builds assets and serves static files
- `src/App.tsx` - Main application component containing all chat logic
- `src/styles.css` - Tailwind CSS with theme variables (dark/light mode)

**API Configuration:**
- Uses `@anthropic-ai/sdk` with a local proxy at `http://localhost:4141`
- Claude model: `claude-opus-4.5`
- System prompt identifies the agent as Leo Cavalcante's personal assistant

**Tools available to the agent:**
- `web_search` - DuckDuckGo search
- `get_weather` - Open-Meteo weather API
- `web_fetch` - Fetch and parse web content

**State management:**
- Sessions persisted to localStorage
- Multi-session support with sidebar navigation
- Streaming responses with tool use loop
