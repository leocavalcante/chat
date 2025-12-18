import { useState, useRef, useEffect } from "react";
import Anthropic from "@anthropic-ai/sdk";
import { marked } from "marked";

const client = new Anthropic({
  apiKey: "noop",
  baseURL: "http://localhost:4141",
  dangerouslyAllowBrowser: true,
});

const MAX_TOKENS = 200000;
const SESSIONS_KEY = "chat_sessions";
const CURRENT_SESSION_KEY = "chat_current_session";
const THEME_KEY = "chat_theme";

type Theme = "dark" | "light";

function loadTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function saveTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

const tools: Anthropic.Tool[] = [
  {
    name: "web_search",
    description: "Search the web for current information. Use this when you need to find up-to-date information, news, or facts that may not be in your training data.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query to look up",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather information for a location. Use this when the user asks about weather conditions.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "The city or location to get weather for (e.g., 'London', 'New York', 'Tokyo')",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "web_fetch",
    description: "Fetch the content of a web page. Use this when you need to read the content of a specific URL.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch content from",
        },
      },
      required: ["url"],
    },
  },
];

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

    if (!results) {
      results = "No results found for this query.";
    }

    return results;
  } catch (error) {
    return `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

async function getWeather(location: string): Promise<string> {
  try {
    // First, geocode the location using Open-Meteo's geocoding API
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      return `Could not find location: ${location}`;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Get weather data from Open-Meteo
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
    );
    const weatherData = await weatherResponse.json();

    const current = weatherData.current;
    const weatherDescriptions: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    };

    const description = weatherDescriptions[current.weather_code] || "Unknown";

    return `Weather in ${name}, ${country}:
- Condition: ${description}
- Temperature: ${current.temperature_2m}°C
- Feels like: ${current.apparent_temperature}°C
- Humidity: ${current.relative_humidity_2m}%
- Wind speed: ${current.wind_speed_10m} km/h`;
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
    // Strip HTML tags for readability if it's HTML
    if (contentType.includes("text/html")) {
      const stripped = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Limit length to avoid huge responses
      return stripped.slice(0, 10000) + (stripped.length > 10000 ? "..." : "");
    }
    return text.slice(0, 10000) + (text.length > 10000 ? "..." : "");
  } catch (error) {
    return `Fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Session = {
  id: string;
  title: string;
  messages: Message[];
  tokenCount: number;
  createdAt: number;
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createNewSession(): Session {
  return {
    id: generateId(),
    title: "New Chat",
    messages: [],
    tokenCount: 0,
    createdAt: Date.now(),
  };
}

function loadSessions(): Session[] {
  try {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load sessions:", e);
  }
  return [];
}

function saveSessions(sessions: Session[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save sessions:", e);
  }
}

function loadCurrentSessionId(): string | null {
  return localStorage.getItem(CURRENT_SESSION_KEY);
}

function saveCurrentSessionId(id: string) {
  localStorage.setItem(CURRENT_SESSION_KEY, id);
}

function LoadingSpinner() {
  return (
    <div className="self-start flex gap-1.5 px-4 py-3 animate-fade-up">
      <span className="typing-dot w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" />
      <span className="typing-dot w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" />
      <span className="typing-dot w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" />
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

function MessageBubble({ role, content, theme }: Message & { theme: Theme }) {
  if (role === "assistant") {
    return (
      <div
        className={`animate-fade-up self-start max-w-[75%] prose prose-sm prose-p:leading-relaxed prose-p:my-2 prose-pre:border prose-code:before:content-none prose-code:after:content-none ${
          theme === "dark"
            ? "prose-invert prose-pre:bg-zinc-900 prose-pre:border-zinc-800 prose-code:text-zinc-300"
            : "prose-pre:bg-zinc-100 prose-pre:border-zinc-200 prose-code:text-zinc-700"
        }`}
        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
      />
    );
  }
  return (
    <div className="animate-fade-up self-end bg-[var(--bg-secondary)] rounded-2xl px-4 py-2.5 max-w-[75%] text-[var(--text-primary)]">
      {content}
    </div>
  );
}

function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  loadingSessions,
  unreadSessions,
  theme,
  onToggleTheme,
}: {
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  loadingSessions: Set<string>;
  unreadSessions: Set<string>;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <div className="w-64 bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col">
      <div className="p-3 flex items-center gap-2">
        <button
          onClick={onNewSession}
          className="flex-1 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 px-3 py-2 my-0.5 rounded-lg cursor-pointer ${
              session.id === currentSessionId
                ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/50"
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            {loadingSessions.has(session.id) && (
              <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-pulse flex-shrink-0" />
            )}
            {!loadingSessions.has(session.id) && unreadSessions.has(session.id) && (
              <span className="w-1.5 h-1.5 bg-[var(--text-primary)] rounded-full flex-shrink-0" />
            )}
            <span className="flex-1 truncate text-sm">{session.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function initializeState(): { sessions: Session[]; currentSession: Session } {
  let sessions = loadSessions();
  const currentId = loadCurrentSessionId();
  let currentSession = sessions.find((s) => s.id === currentId);

  if (!currentSession) {
    currentSession = createNewSession();
    sessions = [currentSession, ...sessions];
    saveSessions(sessions);
    saveCurrentSessionId(currentSession.id);
  }

  return { sessions, currentSession };
}

export default function App() {
  const initial = initializeState();
  const [sessions, setSessions] = useState<Session[]>(initial.sessions);
  const [currentSession, setCurrentSession] = useState<Session>(initial.currentSession);
  const [input, setInput] = useState("");
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set());
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});
  const [unreadSessions, setUnreadSessions] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentSessionRef = useRef(currentSession.id);

  const isCurrentSessionLoading = loadingSessions.has(currentSession.id);
  const currentStreamingContent = streamingContent[currentSession.id] || "";

  // Initialize theme on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const handleToggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  // Keep ref in sync with current session
  useEffect(() => {
    currentSessionRef.current = currentSession.id;
  }, [currentSession.id]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [currentSession.messages, currentStreamingContent]);

  useEffect(() => {
    const updatedSessions = sessions.map((s) =>
      s.id === currentSession.id ? currentSession : s
    );
    saveSessions(updatedSessions);
    saveCurrentSessionId(currentSession.id);
  }, [currentSession, sessions]);

  // Focus input when current session stops loading
  useEffect(() => {
    if (!isCurrentSessionLoading) {
      inputRef.current?.focus();
    }
  }, [isCurrentSessionLoading]);

  const handleNewSession = () => {
    const newSession = createNewSession();
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSession(newSession);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (session) {
      setCurrentSession(session);
      // Clear unread when selecting a session
      setUnreadSessions((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteSession = (id: string) => {
    const updatedSessions = sessions.filter((s) => s.id !== id);
    setSessions(updatedSessions);

    if (currentSession.id === id) {
      if (updatedSessions.length > 0) {
        setCurrentSession(updatedSessions[0]);
      } else {
        const newSession = createNewSession();
        setSessions([newSession]);
        setCurrentSession(newSession);
      }
    }
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isCurrentSessionLoading) return;

    setInput("");
    let conversationMessages: Anthropic.MessageParam[] = [
      ...currentSession.messages,
      { role: "user", content },
    ];
    const sessionId = currentSession.id;

    // Update title if first message
    const newTitle = currentSession.messages.length === 0
      ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
      : currentSession.title;

    const displayMessages: Message[] = [...currentSession.messages, { role: "user", content }];

    setCurrentSession((prev) => ({
      ...prev,
      messages: displayMessages,
      title: newTitle,
    }));

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, messages: displayMessages, title: newTitle }
          : s
      )
    );

    setLoadingSessions((prev) => new Set(prev).add(sessionId));
    setStreamingContent((prev) => ({ ...prev, [sessionId]: "" }));

    try {
      let fullContent = "";
      let tokenCount = 0;

      // Tool use loop
      while (true) {
        const stream = await client.messages.stream({
          model: "claude-opus-4.5",
          max_tokens: MAX_TOKENS,
          system: "You are Leo Cavalcante's personal AI assistant. Be skeptical, objective, and use few words. Get to the point.",
          messages: conversationMessages,
          tools,
        });

        let currentContent = "";
        let toolUseBlocks: Anthropic.ToolUseBlock[] = [];

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            currentContent += event.delta.text;
            setStreamingContent((prev) => ({ ...prev, [sessionId]: fullContent + currentContent }));
          }
        }

        const finalMessage = await stream.finalMessage();
        tokenCount += finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;

        // Extract tool use blocks
        for (const block of finalMessage.content) {
          if (block.type === "tool_use") {
            toolUseBlocks.push(block);
          }
        }

        fullContent += currentContent;

        // If no tool use, we're done
        if (finalMessage.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
          break;
        }

        // Handle tool use
        conversationMessages.push({
          role: "assistant",
          content: finalMessage.content,
        });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        const toolStatusMessages: string[] = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.name === "web_search") {
            const input = toolUse.input as { query: string };
            setStreamingContent((prev) => ({
              ...prev,
              [sessionId]: fullContent + `\n\n*Searching for: "${input.query}"...*\n\n`,
            }));
            const result = await performWebSearch(input.query);
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: result,
            });
            toolStatusMessages.push(`*Searched: "${input.query}"*`);
          } else if (toolUse.name === "get_weather") {
            const input = toolUse.input as { location: string };
            setStreamingContent((prev) => ({
              ...prev,
              [sessionId]: fullContent + `\n\n*Getting weather for: ${input.location}...*\n\n`,
            }));
            const result = await getWeather(input.location);
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: result,
            });
            toolStatusMessages.push(`*Weather lookup: ${input.location}*`);
          } else if (toolUse.name === "web_fetch") {
            const input = toolUse.input as { url: string };
            setStreamingContent((prev) => ({
              ...prev,
              [sessionId]: fullContent + `\n\n*Fetching: ${input.url}...*\n\n`,
            }));
            const result = await webFetch(input.url);
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: result,
            });
            toolStatusMessages.push(`*Fetched: ${input.url}*`);
          }
        }

        conversationMessages.push({
          role: "user",
          content: toolResults,
        });

        // Update streaming to show tool use is done
        fullContent += `\n\n${toolStatusMessages.join("\n")}\n\n`;
        setStreamingContent((prev) => ({ ...prev, [sessionId]: fullContent }));
      }

      const finalMessages: Message[] = [...displayMessages, { role: "assistant", content: fullContent }];

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: finalMessages, tokenCount, title: newTitle }
            : s
        )
      );
      setCurrentSession((prev) =>
        prev.id === sessionId
          ? { ...prev, messages: finalMessages, tokenCount }
          : prev
      );
      // Mark as unread if not the current session
      if (currentSessionRef.current !== sessionId) {
        setUnreadSessions((prev) => new Set(prev).add(sessionId));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const finalMessages: Message[] = [...displayMessages, { role: "assistant", content: `Error: ${errorMessage}` }];
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: finalMessages }
            : s
        )
      );
      setCurrentSession((prev) =>
        prev.id === sessionId
          ? { ...prev, messages: finalMessages }
          : prev
      );
    } finally {
      setLoadingSessions((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
      setStreamingContent((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  const percentage = ((currentSession.tokenCount / MAX_TOKENS) * 100).toFixed(1);

  return (
    <div className="h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSession.id}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        loadingSessions={loadingSessions}
        unreadSessions={unreadSessions}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <div className="flex-1 flex flex-col bg-[var(--bg-primary)]">
        <header className="px-6 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
          <h1 className="text-sm font-medium text-[var(--text-secondary)]">{currentSession.title}</h1>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span>{currentSession.tokenCount.toLocaleString()} tokens</span>
            <span>·</span>
            <span>{percentage}%</span>
          </div>
        </header>

        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
            {currentSession.messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                <p className="text-[var(--text-muted)] text-sm">Start a conversation</p>
              </div>
            )}
            {currentSession.messages.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} theme={theme} />
            ))}
            {isCurrentSessionLoading && !currentStreamingContent && <LoadingSpinner />}
            {currentStreamingContent && (
              <div
                className={`animate-fade-up self-start max-w-[75%] prose prose-sm prose-p:leading-relaxed prose-p:my-2 prose-pre:border prose-code:before:content-none prose-code:after:content-none ${
                  theme === "dark"
                    ? "prose-invert prose-pre:bg-zinc-900 prose-pre:border-zinc-800 prose-code:text-zinc-300"
                    : "prose-pre:bg-zinc-100 prose-pre:border-zinc-200 prose-code:text-zinc-700"
                }`}
                dangerouslySetInnerHTML={{ __html: marked.parse(currentStreamingContent) as string }}
              />
            )}
          </div>
        </div>

        <div className="border-t border-[var(--border-color)] p-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="Message..."
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCurrentSessionLoading}
              className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--text-muted)] disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={isCurrentSessionLoading || !input.trim()}
              className={`px-4 py-3 rounded-xl text-sm font-medium disabled:cursor-not-allowed ${
                theme === "dark"
                  ? "bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
              }`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
