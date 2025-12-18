import { useState, useRef, useEffect } from "react";
import type { Theme, Message, Session } from "./types";
import { Sidebar, ChatHeader, MessageList, ChatInput } from "./components";
import {
  MAX_TOKENS,
  loadTheme,
  saveTheme,
  createNewSession,
  saveSessions,
  saveCurrentSessionId,
  initializeState,
} from "./lib/storage";
import { streamChat } from "./lib/api";

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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const handleToggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    saveTheme(newTheme);
  };

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
    const sessionId = currentSession.id;

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
      const system = "You are Leo Cavalcante's personal AI assistant. Be skeptical, objective, and use few words. Get to the point.";

      for await (const event of streamChat(displayMessages, system)) {
        switch (event.type) {
          case "text":
            fullContent += event.text || "";
            setStreamingContent((prev) => ({ ...prev, [sessionId]: fullContent }));
            break;
          case "tool_start":
            const toolInput = event.input as Record<string, string>;
            const toolLabel = event.name === "web_search"
              ? `Searching for: "${toolInput.query}"`
              : event.name === "get_weather"
              ? `Getting weather for: ${toolInput.location}`
              : `Fetching: ${toolInput.url}`;
            setStreamingContent((prev) => ({
              ...prev,
              [sessionId]: fullContent + `\n\n*${toolLabel}...*\n\n`,
            }));
            break;
          case "tool_end":
            const endInput = event.input as Record<string, string> | undefined;
            const endLabel = event.name === "web_search"
              ? `*Searched: "${endInput?.query || ""}"*`
              : event.name === "get_weather"
              ? `*Weather lookup: ${endInput?.location || ""}*`
              : `*Fetched: ${endInput?.url || ""}*`;
            fullContent += `\n\n${endLabel}\n\n`;
            setStreamingContent((prev) => ({ ...prev, [sessionId]: fullContent }));
            break;
          case "done":
            tokenCount = event.tokenCount || 0;
            break;
          case "error":
            throw new Error(event.message);
        }
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
        <ChatHeader session={currentSession} maxTokens={MAX_TOKENS} />

        <MessageList
          messages={currentSession.messages}
          isLoading={isCurrentSessionLoading}
          streamingContent={currentStreamingContent}
          theme={theme}
          chatRef={chatRef}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          disabled={isCurrentSessionLoading}
          theme={theme}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}
