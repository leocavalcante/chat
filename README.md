# Chat

[![CI](https://github.com/leocavalcante/chat/actions/workflows/ci.yml/badge.svg)](https://github.com/leocavalcante/chat/actions/workflows/ci.yml)

A minimal, elegant chat client for Claude built with React 19 and Bun.

## Features

- **Streaming responses** with real-time token display
- **Multi-session support** with sidebar navigation
- **Dark/Light mode** with system preference detection
- **Server-side tool execution** - web search, weather lookup, and web fetch
- **Local persistence** via localStorage
- **Token tracking** per conversation
- **Graceful shutdown** handling

## Quick Start

```bash
bun install
bun run start
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

The Bun server handles both static files and API routes. It proxies requests to Claude and executes tools server-side.

```
┌─────────────┐     ┌─────────────────────────┐     ┌─────────────┐
│   Browser   │────▶│      Bun Server         │────▶│ Anthropic   │
│             │ SSE │  :3000                  │     │    API      │
│             │◀────│  - Static files         │     └─────────────┘
│             │     │  - /api/chat (proxy)    │
│             │     │  - Tool execution       │
└─────────────┘     └─────────────────────────┘
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | `noop` | API key for Anthropic |
| `ANTHROPIC_BASE_URL` | `http://localhost:4141` | Base URL for API (use proxy or direct) |

## Stack

- **Runtime**: Bun
- **Frontend**: React 19
- **Styling**: Tailwind CSS v4
- **AI**: Claude claude-opus-4.5 via @anthropic-ai/sdk

## License

MIT
