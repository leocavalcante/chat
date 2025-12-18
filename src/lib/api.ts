import type { Message } from "../types";

export interface ChatEvent {
  type: "text" | "tool_start" | "tool_end" | "done" | "error";
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  tokenCount?: number;
  message?: string;
}

export async function* streamChat(
  messages: Message[],
  system: string
): AsyncGenerator<ChatEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7);
      } else if (line.startsWith("data: ") && currentEvent) {
        const data = JSON.parse(line.slice(6));
        yield { type: currentEvent as ChatEvent["type"], ...data };
        currentEvent = "";
      }
    }
  }
}
