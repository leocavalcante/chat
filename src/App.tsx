import { useState, useRef, useEffect } from "react";
import Anthropic from "@anthropic-ai/sdk";
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
import {
  client,
  tools,
  performWebSearch,
  getWeather,
  webFetch,
} from "./lib/api";

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
    let conversationMessages: Anthropic.MessageParam[] = [
      ...currentSession.messages,
      { role: "user", content },
    ];
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

        for (const block of finalMessage.content) {
          if (block.type === "tool_use") {
            toolUseBlocks.push(block);
          }
        }

        fullContent += currentContent;

        if (finalMessage.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
          break;
        }

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
