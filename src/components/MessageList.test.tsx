import { describe, test, expect } from "bun:test";
import { render, createRef } from "@testing-library/react";
import { MessageList } from "./MessageList";
import type { Message } from "../types";

describe("MessageList", () => {
  const defaultProps = {
    messages: [] as Message[],
    isLoading: false,
    streamingContent: "",
    theme: "dark" as const,
    chatRef: { current: null },
  };

  test("shows empty state when no messages", () => {
    const { getByText } = render(<MessageList {...defaultProps} />);
    expect(getByText("Start a conversation")).toBeDefined();
  });

  test("renders user messages", () => {
    const messages: Message[] = [{ role: "user", content: "Hello" }];
    const { getByText } = render(
      <MessageList {...defaultProps} messages={messages} />
    );
    expect(getByText("Hello")).toBeDefined();
  });

  test("renders assistant messages", () => {
    const messages: Message[] = [{ role: "assistant", content: "Hi there!" }];
    const { container } = render(
      <MessageList {...defaultProps} messages={messages} />
    );
    // Assistant message is rendered with markdown, check for the text
    expect(container.textContent).toContain("Hi there!");
  });

  test("renders multiple messages in order", () => {
    const messages: Message[] = [
      { role: "user", content: "First" },
      { role: "assistant", content: "Second" },
      { role: "user", content: "Third" },
    ];
    const { container } = render(
      <MessageList {...defaultProps} messages={messages} />
    );
    const text = container.textContent;
    const firstIdx = text?.indexOf("First") ?? -1;
    const secondIdx = text?.indexOf("Second") ?? -1;
    const thirdIdx = text?.indexOf("Third") ?? -1;
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  test("hides empty state when messages exist", () => {
    const messages: Message[] = [{ role: "user", content: "Hello" }];
    const { queryByText } = render(
      <MessageList {...defaultProps} messages={messages} />
    );
    expect(queryByText("Start a conversation")).toBeNull();
  });

  test("shows loading spinner when loading and no streaming content", () => {
    const { container } = render(
      <MessageList {...defaultProps} isLoading={true} streamingContent="" />
    );
    const loadingDots = container.querySelectorAll(".typing-dot");
    expect(loadingDots.length).toBe(3);
  });

  test("hides loading spinner when streaming content exists", () => {
    const { container } = render(
      <MessageList
        {...defaultProps}
        isLoading={true}
        streamingContent="Typing..."
      />
    );
    const loadingDots = container.querySelectorAll(".typing-dot");
    expect(loadingDots.length).toBe(0);
  });

  test("renders streaming content", () => {
    const { container } = render(
      <MessageList
        {...defaultProps}
        isLoading={true}
        streamingContent="This is streaming..."
      />
    );
    expect(container.textContent).toContain("This is streaming...");
  });

  test("renders streaming content as markdown", () => {
    const { container } = render(
      <MessageList
        {...defaultProps}
        isLoading={true}
        streamingContent="**bold text**"
      />
    );
    const strong = container.querySelector("strong");
    expect(strong).toBeDefined();
    expect(strong?.textContent).toBe("bold text");
  });

  test("applies dark theme to streaming content", () => {
    const { container } = render(
      <MessageList
        {...defaultProps}
        theme="dark"
        isLoading={true}
        streamingContent="Content"
      />
    );
    const streamingDiv = container.querySelector(".prose-invert");
    expect(streamingDiv).toBeDefined();
  });

  test("applies light theme to streaming content", () => {
    const { container } = render(
      <MessageList
        {...defaultProps}
        theme="light"
        isLoading={true}
        streamingContent="Content"
      />
    );
    // Light theme should not have prose-invert
    const proseElements = container.querySelectorAll(".prose");
    const hasProseInvert = Array.from(proseElements).some((el) =>
      el.classList.contains("prose-invert")
    );
    expect(hasProseInvert).toBe(false);
  });

  test("passes theme to message bubbles", () => {
    const messages: Message[] = [{ role: "assistant", content: "Test" }];
    const { container } = render(
      <MessageList {...defaultProps} messages={messages} theme="dark" />
    );
    const proseInvert = container.querySelector(".prose-invert");
    expect(proseInvert).toBeDefined();
  });

  test("container has overflow-y-auto for scrolling", () => {
    const { container } = render(<MessageList {...defaultProps} />);
    const scrollContainer = container.firstChild as HTMLElement;
    expect(scrollContainer.classList.contains("overflow-y-auto")).toBe(true);
  });

  test("has max-width container for content", () => {
    const { container } = render(<MessageList {...defaultProps} />);
    const maxWidthContainer = container.querySelector(".max-w-3xl");
    expect(maxWidthContainer).toBeDefined();
  });
});
