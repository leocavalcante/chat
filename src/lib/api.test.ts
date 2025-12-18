import { describe, test, expect, mock, afterEach } from "bun:test";
import { streamChat, type ChatEvent } from "./api";

const originalFetch = globalThis.fetch;

describe("api", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("streamChat", () => {
    test("streams text events", async () => {
      const sseData = [
        'event: text\ndata: {"text":"Hello"}\n\n',
        'event: text\ndata: {"text":" world"}\n\n',
        'event: done\ndata: {"tokenCount":10}\n\n',
      ].join("");

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(sseData));
              controller.close();
            },
          }),
        })
      ) as typeof fetch;

      const events: ChatEvent[] = [];
      for await (const event of streamChat([{ role: "user", content: "Hi" }], "Be brief")) {
        events.push(event);
      }

      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({ type: "text", text: "Hello" });
      expect(events[1]).toEqual({ type: "text", text: " world" });
      expect(events[2]).toEqual({ type: "done", tokenCount: 10 });
    });

    test("streams tool events", async () => {
      const sseData = [
        'event: tool_start\ndata: {"name":"web_search","input":{"query":"test"}}\n\n',
        'event: tool_end\ndata: {"name":"web_search"}\n\n',
        'event: done\ndata: {"tokenCount":20}\n\n',
      ].join("");

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(sseData));
              controller.close();
            },
          }),
        })
      ) as typeof fetch;

      const events: ChatEvent[] = [];
      for await (const event of streamChat([{ role: "user", content: "Search" }], "")) {
        events.push(event);
      }

      expect(events).toHaveLength(3);
      expect(events[0]).toEqual({ type: "tool_start", name: "web_search", input: { query: "test" } });
      expect(events[1]).toEqual({ type: "tool_end", name: "web_search" });
    });

    test("handles error events", async () => {
      const sseData = 'event: error\ndata: {"message":"API error"}\n\n';

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(sseData));
              controller.close();
            },
          }),
        })
      ) as typeof fetch;

      const events: ChatEvent[] = [];
      for await (const event of streamChat([], "")) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({ type: "error", message: "API error" });
    });

    test("throws on non-OK response", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as typeof fetch;

      await expect(async () => {
        for await (const _ of streamChat([], "")) {
          // consume
        }
      }).toThrow("Chat request failed: 500");
    });

    test("throws when body is missing", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          body: null,
        })
      ) as typeof fetch;

      await expect(async () => {
        for await (const _ of streamChat([], "")) {
          // consume
        }
      }).toThrow("No response body");
    });

    test("sends correct request body", async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('event: done\ndata: {"tokenCount":0}\n\n'));
              controller.close();
            },
          }),
        })
      ) as typeof fetch;
      globalThis.fetch = mockFetch;

      const messages = [{ role: "user" as const, content: "Hello" }];
      const system = "Be helpful";

      for await (const _ of streamChat(messages, system)) {
        // consume
      }

      expect(mockFetch).toHaveBeenCalledWith("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, system }),
      });
    });

    test("handles chunked SSE data", async () => {
      // Simulate chunked transfer where data arrives in separate pieces
      let chunkIndex = 0;
      const chunks = [
        'event: text\ndata: {"text":"chunk"}\n\n',
        'event: done\ndata: {"tokenCount":5}\n\n',
      ];

      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          body: new ReadableStream({
            pull(controller) {
              if (chunkIndex < chunks.length) {
                controller.enqueue(new TextEncoder().encode(chunks[chunkIndex]));
                chunkIndex++;
              } else {
                controller.close();
              }
            },
          }),
        })
      ) as typeof fetch;

      const events: ChatEvent[] = [];
      for await (const event of streamChat([], "")) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: "text", text: "chunk" });
      expect(events[1]).toEqual({ type: "done", tokenCount: 5 });
    });
  });
});
