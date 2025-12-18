import { spawn } from "bun";
import Anthropic from "@anthropic-ai/sdk";

// Build JS
const jsBuild = await Bun.build({
  entrypoints: ["./src/index.tsx"],
  outdir: "./dist",
  minify: false,
});

if (!jsBuild.success) {
  console.error("JS Build failed:", jsBuild.logs);
  process.exit(1);
}

// Build CSS with Tailwind
const cssBuild = spawn({
  cmd: ["bunx", "@tailwindcss/cli", "-i", "./src/styles.css", "-o", "./dist/styles.css"],
  stdout: "inherit",
  stderr: "inherit",
});

await cssBuild.exited;

// Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "noop",
  baseURL: process.env.ANTHROPIC_BASE_URL || "http://localhost:4141",
});

// Tool definitions
const tools: Anthropic.Tool[] = [
  {
    name: "web_search",
    description: "Search the web for current information.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather information for a location.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string", description: "The city or location" },
      },
      required: ["location"],
    },
  },
  {
    name: "web_fetch",
    description: "Fetch the content of a web page.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "The URL to fetch" },
      },
      required: ["url"],
    },
  },
];

// Tool implementations
async function performWebSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    );
    const data = await response.json();
    let results = "";
    if (data.Abstract) {
      results += `Summary: ${data.Abstract}\n\n`;
    }
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      results += "Related results:\n";
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text) {
          results += `- ${topic.Text}\n`;
        }
      }
    }
    return results || "No results found for this query.";
  } catch (error) {
    return `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

async function getWeather(location: string): Promise<string> {
  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    const geoData = await geoResponse.json();
    if (!geoData.results || geoData.results.length === 0) {
      return `Could not find location: ${location}`;
    }
    const { latitude, longitude, name, country } = geoData.results[0];
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
    );
    const weatherData = await weatherResponse.json();
    const current = weatherData.current;
    const weatherDescriptions: Record<number, string> = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Foggy", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
      55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
      71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
      80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
      85: "Slight snow showers", 86: "Heavy snow showers", 95: "Thunderstorm",
      96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
    };
    const description = weatherDescriptions[current.weather_code] || "Unknown";
    return `Weather in ${name}, ${country}:\n- Condition: ${description}\n- Temperature: ${current.temperature_2m}°C\n- Feels like: ${current.apparent_temperature}°C\n- Humidity: ${current.relative_humidity_2m}%\n- Wind speed: ${current.wind_speed_10m} km/h`;
  } catch (error) {
    return `Weather lookup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

async function webFetch(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return `Failed to fetch: ${response.status} ${response.statusText}`;
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return JSON.stringify(data, null, 2);
    }
    const text = await response.text();
    if (contentType.includes("text/html")) {
      const stripped = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return stripped.slice(0, 10000) + (stripped.length > 10000 ? "..." : "");
    }
    return text.slice(0, 10000) + (text.length > 10000 ? "..." : "");
  } catch (error) {
    return `Fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "web_search":
      return performWebSearch(input.query as string);
    case "get_weather":
      return getWeather(input.location as string);
    case "web_fetch":
      return webFetch(input.url as string);
    default:
      return `Unknown tool: ${name}`;
  }
}

// Track active SSE connections for graceful shutdown
const activeConnections = new Set<ReadableStreamDefaultController>();

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Static file routes
    if (path === "/" || path === "/index.html") {
      return new Response(Bun.file("index.html"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (path === "/dist/index.js") {
      return new Response(Bun.file("./dist/index.js"), {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    if (path === "/dist/styles.css") {
      return new Response(Bun.file("./dist/styles.css"), {
        headers: { "Content-Type": "text/css" },
      });
    }

    // API route: Chat with streaming and tool handling
    if (path === "/api/chat" && req.method === "POST") {
      const body = await req.json();
      const { messages, system } = body as {
        messages: Anthropic.MessageParam[];
        system: string;
      };

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          activeConnections.add(controller);

          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          let conversationMessages = [...messages];
          let totalTokens = 0;

          try {
            while (true) {
              const apiStream = await anthropic.messages.stream({
                model: "claude-opus-4.5",
                max_tokens: 16384,
                system,
                messages: conversationMessages,
                tools,
              });

              for await (const event of apiStream) {
                if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                  send("text", { text: event.delta.text });
                }
              }

              const finalMessage = await apiStream.finalMessage();
              totalTokens += finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;

              const toolUseBlocks = finalMessage.content.filter(
                (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
              );

              if (finalMessage.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
                send("done", { tokenCount: totalTokens });
                break;
              }

              // Process tool calls
              conversationMessages.push({
                role: "assistant",
                content: finalMessage.content,
              });

              const toolResults: Anthropic.ToolResultBlockParam[] = [];

              for (const toolUse of toolUseBlocks) {
                send("tool_start", { name: toolUse.name, input: toolUse.input });
                const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolUse.id,
                  content: result,
                });
                send("tool_end", { name: toolUse.name });
              }

              conversationMessages.push({
                role: "user",
                content: toolResults,
              });
            }
          } catch (error) {
            send("error", { message: error instanceof Error ? error.message : "Unknown error" });
          } finally {
            activeConnections.delete(controller);
          }

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);

  // Close all active SSE connections
  for (const controller of activeConnections) {
    try {
      controller.close();
    } catch {
      // Already closed
    }
  }
  activeConnections.clear();

  // Stop accepting new connections
  server.stop();
  console.log("Server stopped");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
