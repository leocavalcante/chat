# Chat

A minimal, elegant chat client for Claude built with React 19 and Bun.

## Features

- **Streaming responses** with real-time token display
- **Multi-session support** with sidebar navigation
- **Dark/Light mode** with system preference detection
- **Tool use** - web search, weather lookup, and web fetch
- **Local persistence** via localStorage
- **Token tracking** per conversation

## Quick Start

```bash
bun install
bun run start
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

The app connects to a local Claude proxy at `http://localhost:4141`. Configure your proxy to forward requests to the Anthropic API with your credentials.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│ Local Proxy │────▶│ Anthropic   │
│  :3000      │     │   :4141     │     │    API      │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Stack

- **Runtime**: Bun
- **Frontend**: React 19
- **Styling**: Tailwind CSS v4
- **AI**: Claude claude-opus-4-5 via @anthropic-ai/sdk

## License

MIT
