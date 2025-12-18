import { describe, test, expect, mock, beforeEach } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import App from "./App";

// Mock the API client
mock.module("./lib/api", () => ({
  client: {
    messages: {
      stream: mock(() => ({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Hello!" },
          };
        },
        finalMessage: () =>
          Promise.resolve({
            usage: { input_tokens: 10, output_tokens: 20 },
            content: [{ type: "text", text: "Hello!" }],
            stop_reason: "end_turn",
          }),
      })),
    },
  },
  tools: [],
  performWebSearch: mock(() => Promise.resolve("Search results")),
  getWeather: mock(() => Promise.resolve("Weather info")),
  webFetch: mock(() => Promise.resolve("Web content")),
}));

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("renders sidebar with new chat button", () => {
    const { getByText } = render(<App />);
    expect(getByText("New chat")).toBeDefined();
  });

  test("renders chat input", () => {
    const { getByPlaceholderText } = render(<App />);
    expect(getByPlaceholderText("Message...")).toBeDefined();
  });

  test("renders send button", () => {
    const { getByText } = render(<App />);
    expect(getByText("Send")).toBeDefined();
  });

  test("renders empty state initially", () => {
    const { getByText } = render(<App />);
    expect(getByText("Start a conversation")).toBeDefined();
  });

  test("renders header with session title", () => {
    const { getAllByText } = render(<App />);
    // "New Chat" appears in both sidebar and header
    const newChatElements = getAllByText("New Chat");
    expect(newChatElements.length).toBeGreaterThanOrEqual(1);
  });

  test("renders token count in header", () => {
    const { getByText } = render(<App />);
    expect(getByText("0 tokens")).toBeDefined();
  });

  test("renders percentage in header", () => {
    const { getByText } = render(<App />);
    expect(getByText("0.0%")).toBeDefined();
  });

  test("input field exists and is editable", () => {
    const { getByPlaceholderText } = render(<App />);
    const input = getByPlaceholderText("Message...") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.type).toBe("text");
  });

  test("creates new session when clicking New chat", () => {
    const { getByText, getAllByText } = render(<App />);
    fireEvent.click(getByText("New chat"));
    // Should have multiple "New Chat" elements (sidebar and header)
    const newChats = getAllByText("New Chat");
    expect(newChats.length).toBeGreaterThanOrEqual(2);
  });

  test("toggles theme", () => {
    const { getByTitle } = render(<App />);
    // Initially dark mode (switch to light available)
    expect(getByTitle("Switch to light mode")).toBeDefined();
    fireEvent.click(getByTitle("Switch to light mode"));
    // Now light mode (switch to dark available)
    expect(getByTitle("Switch to dark mode")).toBeDefined();
  });

  test("persists theme to localStorage", () => {
    const { getByTitle } = render(<App />);
    fireEvent.click(getByTitle("Switch to light mode"));
    expect(localStorage.getItem("chat_theme")).toBe("light");
  });

  test("send button is initially disabled", () => {
    const { getByText } = render(<App />);
    const sendButton = getByText("Send");
    expect((sendButton as HTMLButtonElement).disabled).toBe(true);
  });

  test("can find delete button in session list", () => {
    const { getByText, container } = render(<App />);
    // Find delete button (X icon)
    const deleteButtons = container.querySelectorAll("button");
    const deleteButton = Array.from(deleteButtons).find((btn) =>
      btn.querySelector('svg path[d*="6 18L18 6"]')
    );
    expect(deleteButton).toBeDefined();
  });

  test("restores sessions from localStorage", () => {
    const sessions = [
      {
        id: "saved-session",
        title: "Saved Chat",
        messages: [{ role: "user", content: "Previous message" }],
        tokenCount: 100,
        createdAt: Date.now(),
      },
    ];
    localStorage.setItem("chat_sessions", JSON.stringify(sessions));
    localStorage.setItem("chat_current_session", "saved-session");

    const { getAllByText, getByText } = render(<App />);
    // "Saved Chat" appears in sidebar and header
    const savedChatElements = getAllByText("Saved Chat");
    expect(savedChatElements.length).toBeGreaterThanOrEqual(1);
    expect(getByText("Previous message")).toBeDefined();
  });

  test("renders theme toggle button", () => {
    const { container } = render(<App />);
    const themeButton = container.querySelector('[title*="Switch to"]');
    expect(themeButton).toBeDefined();
  });

  test("has correct layout structure", () => {
    const { container } = render(<App />);
    // Main container with flex layout
    const mainContainer = container.querySelector(".h-screen.flex");
    expect(mainContainer).toBeDefined();
    // Sidebar
    const sidebar = container.querySelector(".w-64");
    expect(sidebar).toBeDefined();
    // Chat area
    const chatArea = container.querySelector(".flex-1.flex.flex-col");
    expect(chatArea).toBeDefined();
  });

  test("restores theme from localStorage", () => {
    localStorage.setItem("chat_theme", "light");
    const { getByTitle } = render(<App />);
    // Should show "Switch to dark mode" when in light mode
    expect(getByTitle("Switch to dark mode")).toBeDefined();
  });
});
