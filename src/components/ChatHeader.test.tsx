import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { ChatHeader } from "./ChatHeader";
import type { Session } from "../types";

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: "test-id",
  title: "Test Chat",
  messages: [],
  tokenCount: 0,
  createdAt: Date.now(),
  ...overrides,
});

describe("ChatHeader", () => {
  test("renders session title", () => {
    const session = createMockSession({ title: "My Conversation" });
    const { getByText } = render(<ChatHeader session={session} maxTokens={200000} />);
    expect(getByText("My Conversation")).toBeDefined();
  });

  test("displays token count", () => {
    const session = createMockSession({ tokenCount: 1500 });
    const { getByText } = render(<ChatHeader session={session} maxTokens={200000} />);
    expect(getByText("1,500 tokens")).toBeDefined();
  });

  test("displays token count with locale formatting", () => {
    const session = createMockSession({ tokenCount: 150000 });
    const { getByText } = render(<ChatHeader session={session} maxTokens={200000} />);
    expect(getByText("150,000 tokens")).toBeDefined();
  });

  test("calculates and displays percentage", () => {
    const session = createMockSession({ tokenCount: 100000 });
    const { getByText } = render(<ChatHeader session={session} maxTokens={200000} />);
    expect(getByText("50.0%")).toBeDefined();
  });

  test("displays zero percentage for empty session", () => {
    const session = createMockSession({ tokenCount: 0 });
    const { getByText } = render(<ChatHeader session={session} maxTokens={200000} />);
    expect(getByText("0.0%")).toBeDefined();
  });

  test("displays percentage with one decimal place", () => {
    const session = createMockSession({ tokenCount: 33333 });
    const { getByText } = render(<ChatHeader session={session} maxTokens={200000} />);
    // 33333/200000 = 16.6665%, should display as 16.7%
    expect(getByText("16.7%")).toBeDefined();
  });

  test("renders in header element", () => {
    const session = createMockSession();
    const { container } = render(<ChatHeader session={session} maxTokens={200000} />);
    expect(container.querySelector("header")).toBeDefined();
  });

  test("has border styling", () => {
    const session = createMockSession();
    const { container } = render(<ChatHeader session={session} maxTokens={200000} />);
    const header = container.querySelector("header")!;
    expect(header.classList.contains("border-b")).toBe(true);
  });
});
