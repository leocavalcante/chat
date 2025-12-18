import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { MessageBubble } from "./MessageBubble";

describe("MessageBubble", () => {
  describe("user messages", () => {
    test("renders user content as plain text", () => {
      const { getByText } = render(
        <MessageBubble role="user" content="Hello world" theme="dark" />
      );
      expect(getByText("Hello world")).toBeDefined();
    });

    test("has self-end alignment for user messages", () => {
      const { container } = render(
        <MessageBubble role="user" content="Test" theme="dark" />
      );
      const bubble = container.firstChild as HTMLElement;
      expect(bubble.classList.contains("self-end")).toBe(true);
    });

    test("has rounded styling", () => {
      const { container } = render(
        <MessageBubble role="user" content="Test" theme="dark" />
      );
      const bubble = container.firstChild as HTMLElement;
      expect(bubble.classList.contains("rounded-2xl")).toBe(true);
    });
  });

  describe("assistant messages", () => {
    test("renders markdown content as HTML", () => {
      const { container } = render(
        <MessageBubble role="assistant" content="**bold text**" theme="dark" />
      );
      const strong = container.querySelector("strong");
      expect(strong).toBeDefined();
      expect(strong?.textContent).toBe("bold text");
    });

    test("has self-start alignment for assistant messages", () => {
      const { container } = render(
        <MessageBubble role="assistant" content="Test" theme="dark" />
      );
      const bubble = container.firstChild as HTMLElement;
      expect(bubble.classList.contains("self-start")).toBe(true);
    });

    test("has prose class for typography", () => {
      const { container } = render(
        <MessageBubble role="assistant" content="Test" theme="dark" />
      );
      const bubble = container.firstChild as HTMLElement;
      expect(bubble.classList.contains("prose")).toBe(true);
    });

    test("applies dark theme classes", () => {
      const { container } = render(
        <MessageBubble role="assistant" content="Test" theme="dark" />
      );
      const bubble = container.firstChild as HTMLElement;
      expect(bubble.classList.contains("prose-invert")).toBe(true);
    });

    test("applies light theme classes", () => {
      const { container } = render(
        <MessageBubble role="assistant" content="Test" theme="light" />
      );
      const bubble = container.firstChild as HTMLElement;
      expect(bubble.classList.contains("prose-invert")).toBe(false);
    });

    test("renders code blocks", () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content="```js\nconst x = 1;\n```"
          theme="dark"
        />
      );
      const code = container.querySelector("code");
      expect(code).toBeDefined();
    });
  });
});
