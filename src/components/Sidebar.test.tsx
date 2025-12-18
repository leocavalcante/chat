import { describe, test, expect, mock } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import type { Session } from "../types";

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: "test-id",
  title: "Test Chat",
  messages: [],
  tokenCount: 0,
  createdAt: Date.now(),
  ...overrides,
});

describe("Sidebar", () => {
  const defaultProps = {
    sessions: [createMockSession()],
    currentSessionId: "test-id",
    onSelectSession: mock(() => {}),
    onNewSession: mock(() => {}),
    onDeleteSession: mock(() => {}),
    loadingSessions: new Set<string>(),
    unreadSessions: new Set<string>(),
    theme: "dark" as const,
    onToggleTheme: mock(() => {}),
  };

  test("renders new chat button", () => {
    const { getByText } = render(<Sidebar {...defaultProps} />);
    expect(getByText("New chat")).toBeDefined();
  });

  test("calls onNewSession when new chat button clicked", () => {
    const onNewSession = mock(() => {});
    const { getByText } = render(
      <Sidebar {...defaultProps} onNewSession={onNewSession} />
    );
    fireEvent.click(getByText("New chat"));
    expect(onNewSession).toHaveBeenCalledTimes(1);
  });

  test("renders all sessions", () => {
    const sessions = [
      createMockSession({ id: "1", title: "Chat 1" }),
      createMockSession({ id: "2", title: "Chat 2" }),
      createMockSession({ id: "3", title: "Chat 3" }),
    ];
    const { getByText } = render(
      <Sidebar {...defaultProps} sessions={sessions} currentSessionId="1" />
    );
    expect(getByText("Chat 1")).toBeDefined();
    expect(getByText("Chat 2")).toBeDefined();
    expect(getByText("Chat 3")).toBeDefined();
  });

  test("calls onSelectSession when session clicked", () => {
    const onSelectSession = mock(() => {});
    const sessions = [createMockSession({ id: "session-1", title: "My Chat" })];
    const { getByText } = render(
      <Sidebar
        {...defaultProps}
        sessions={sessions}
        currentSessionId="other"
        onSelectSession={onSelectSession}
      />
    );
    fireEvent.click(getByText("My Chat"));
    expect(onSelectSession).toHaveBeenCalledWith("session-1");
  });

  test("highlights current session", () => {
    const sessions = [
      createMockSession({ id: "current", title: "Current" }),
      createMockSession({ id: "other", title: "Other" }),
    ];
    const { getByText } = render(
      <Sidebar {...defaultProps} sessions={sessions} currentSessionId="current" />
    );
    const currentItem = getByText("Current").closest("div");
    expect(currentItem?.classList.contains("bg-[var(--bg-secondary)]")).toBe(true);
  });

  test("shows loading indicator for loading sessions", () => {
    const sessions = [createMockSession({ id: "loading-session" })];
    const { container } = render(
      <Sidebar
        {...defaultProps}
        sessions={sessions}
        currentSessionId="loading-session"
        loadingSessions={new Set(["loading-session"])}
      />
    );
    const pulsingDot = container.querySelector(".animate-pulse");
    expect(pulsingDot).toBeDefined();
  });

  test("shows unread indicator for unread sessions", () => {
    const sessions = [createMockSession({ id: "unread-session", title: "Unread" })];
    const { container } = render(
      <Sidebar
        {...defaultProps}
        sessions={sessions}
        currentSessionId="other-session"
        unreadSessions={new Set(["unread-session"])}
      />
    );
    // Unread indicator is a small dot
    const sessionItem = container.querySelector('[class*="w-1.5"][class*="h-1.5"]');
    expect(sessionItem).toBeDefined();
  });

  test("calls onDeleteSession when delete button clicked", () => {
    const onDeleteSession = mock(() => {});
    const sessions = [createMockSession({ id: "to-delete", title: "Delete Me" })];
    const { container } = render(
      <Sidebar
        {...defaultProps}
        sessions={sessions}
        currentSessionId="to-delete"
        onDeleteSession={onDeleteSession}
      />
    );
    // Find the delete button (has the X icon)
    const deleteButtons = container.querySelectorAll("button");
    // Last button should be the delete button (after New chat and theme toggle)
    const deleteButton = Array.from(deleteButtons).find((btn) =>
      btn.querySelector('svg path[d*="6 18L18 6"]')
    );
    expect(deleteButton).toBeDefined();
    fireEvent.click(deleteButton!);
    expect(onDeleteSession).toHaveBeenCalledWith("to-delete");
  });

  test("delete button click does not trigger session selection", () => {
    const onSelectSession = mock(() => {});
    const onDeleteSession = mock(() => {});
    const sessions = [createMockSession({ id: "test", title: "Test" })];
    const { container } = render(
      <Sidebar
        {...defaultProps}
        sessions={sessions}
        currentSessionId="test"
        onSelectSession={onSelectSession}
        onDeleteSession={onDeleteSession}
      />
    );
    const deleteButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.querySelector('svg path[d*="6 18L18 6"]')
    );
    fireEvent.click(deleteButton!);
    expect(onDeleteSession).toHaveBeenCalled();
    expect(onSelectSession).not.toHaveBeenCalled();
  });

  test("renders theme toggle", () => {
    const { getByTitle } = render(<Sidebar {...defaultProps} theme="dark" />);
    expect(getByTitle("Switch to light mode")).toBeDefined();
  });

  test("calls onToggleTheme when theme toggle clicked", () => {
    const onToggleTheme = mock(() => {});
    const { getByTitle } = render(
      <Sidebar {...defaultProps} theme="dark" onToggleTheme={onToggleTheme} />
    );
    fireEvent.click(getByTitle("Switch to light mode"));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });
});
