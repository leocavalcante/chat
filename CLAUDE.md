# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
bun install          # Install dependencies
bun run start        # Build and run dev server on http://localhost:3000
bun run test         # Run unit and component tests
bun run test:app     # Run App integration tests
bun run test:all     # Run all tests
```

The start command runs `server.ts` which:
1. Builds the React app via `Bun.build()` to `dist/index.js`
2. Compiles Tailwind CSS via `bunx @tailwindcss/cli` to `dist/styles.css`
3. Serves the app and API on port 3000

## Architecture

This is a personal chat client for Claude, built with React 19 and Bun.

**Key files:**
- `server.ts` - Bun HTTP server with API routes, tool execution, and static file serving
- `src/App.tsx` - Main React component with chat UI and session management
- `src/lib/api.ts` - Client-side SSE stream consumer for `/api/chat`
- `src/styles.css` - Tailwind CSS with theme variables (dark/light mode)

**Server (`server.ts`):**
- Proxies Anthropic API via `POST /api/chat` with SSE streaming
- Executes tools server-side (web_search, get_weather, web_fetch)
- Handles tool use loop automatically
- Graceful shutdown on SIGINT/SIGTERM
- Configurable via `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` env vars

**API Configuration:**
- Default base URL: `http://localhost:4141` (local proxy)
- Claude model: `claude-opus-4.5`
- System prompt identifies the agent as Leo Cavalcante's personal assistant

**Tools (server-side):**
- `web_search` - DuckDuckGo search
- `get_weather` - Open-Meteo weather API
- `web_fetch` - Fetch and parse web content

**State management:**
- Sessions persisted to localStorage
- Multi-session support with sidebar navigation
- Streaming responses via SSE
