import { describe, test, expect } from "bun:test";
import type { Theme, Message, Session } from "./index";

describe("types", () => {
  test("Theme type accepts dark and light", () => {
    const dark: Theme = "dark";
    const light: Theme = "light";
    expect(dark).toBe("dark");
    expect(light).toBe("light");
  });

  test("Message type has role and content", () => {
    const userMessage: Message = { role: "user", content: "Hello" };
    const assistantMessage: Message = { role: "assistant", content: "Hi" };
    expect(userMessage.role).toBe("user");
    expect(assistantMessage.role).toBe("assistant");
  });

  test("Session type has all required properties", () => {
    const session: Session = {
      id: "test-id",
      title: "Test Session",
      messages: [],
      tokenCount: 0,
      createdAt: Date.now(),
    };
    expect(session.id).toBe("test-id");
    expect(session.title).toBe("Test Session");
    expect(Array.isArray(session.messages)).toBe(true);
    expect(typeof session.tokenCount).toBe("number");
    expect(typeof session.createdAt).toBe("number");
  });

  test("Session messages can contain Message objects", () => {
    const session: Session = {
      id: "test",
      title: "Test",
      messages: [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ],
      tokenCount: 100,
      createdAt: Date.now(),
    };
    expect(session.messages).toHaveLength(2);
    expect(session.messages[0].role).toBe("user");
    expect(session.messages[1].role).toBe("assistant");
  });
});
