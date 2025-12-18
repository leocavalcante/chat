import { describe, test, expect, beforeEach } from "bun:test";
import {
  MAX_TOKENS,
  SESSIONS_KEY,
  CURRENT_SESSION_KEY,
  THEME_KEY,
  loadTheme,
  saveTheme,
  generateId,
  createNewSession,
  loadSessions,
  saveSessions,
  loadCurrentSessionId,
  saveCurrentSessionId,
  initializeState,
} from "./storage";
import type { Session } from "../types";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("constants", () => {
    test("MAX_TOKENS is 200000", () => {
      expect(MAX_TOKENS).toBe(200000);
    });

    test("storage keys are defined", () => {
      expect(SESSIONS_KEY).toBe("chat_sessions");
      expect(CURRENT_SESSION_KEY).toBe("chat_current_session");
      expect(THEME_KEY).toBe("chat_theme");
    });
  });

  describe("generateId", () => {
    test("generates unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    test("generates string IDs", () => {
      const id = generateId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("loadTheme", () => {
    test("returns saved theme when valid", () => {
      localStorage.setItem(THEME_KEY, "light");
      expect(loadTheme()).toBe("light");

      localStorage.setItem(THEME_KEY, "dark");
      expect(loadTheme()).toBe("dark");
    });

    test("returns dark theme when no saved theme (default matchMedia returns false)", () => {
      expect(loadTheme()).toBe("dark");
    });

    test("ignores invalid saved themes", () => {
      localStorage.setItem(THEME_KEY, "invalid");
      expect(loadTheme()).toBe("dark");
    });
  });

  describe("saveTheme", () => {
    test("saves theme to localStorage", () => {
      saveTheme("light");
      expect(localStorage.getItem(THEME_KEY)).toBe("light");
    });

    test("sets data-theme attribute on document", () => {
      saveTheme("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("createNewSession", () => {
    test("creates session with required properties", () => {
      const session = createNewSession();
      expect(session).toHaveProperty("id");
      expect(session.title).toBe("New Chat");
      expect(session.messages).toEqual([]);
      expect(session.tokenCount).toBe(0);
      expect(session.createdAt).toBeLessThanOrEqual(Date.now());
    });

    test("creates unique sessions", () => {
      const session1 = createNewSession();
      const session2 = createNewSession();
      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe("loadSessions", () => {
    test("returns empty array when no sessions saved", () => {
      expect(loadSessions()).toEqual([]);
    });

    test("returns parsed sessions from localStorage", () => {
      const sessions: Session[] = [
        { id: "1", title: "Test", messages: [], tokenCount: 0, createdAt: 123 },
      ];
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      expect(loadSessions()).toEqual(sessions);
    });

    test("returns empty array on parse error", () => {
      localStorage.setItem(SESSIONS_KEY, "invalid json");
      expect(loadSessions()).toEqual([]);
    });
  });

  describe("saveSessions", () => {
    test("saves sessions to localStorage", () => {
      const sessions: Session[] = [
        { id: "1", title: "Test", messages: [], tokenCount: 0, createdAt: 123 },
      ];
      saveSessions(sessions);
      expect(JSON.parse(localStorage.getItem(SESSIONS_KEY)!)).toEqual(sessions);
    });
  });

  describe("loadCurrentSessionId", () => {
    test("returns null when no session ID saved", () => {
      expect(loadCurrentSessionId()).toBeNull();
    });

    test("returns saved session ID", () => {
      localStorage.setItem(CURRENT_SESSION_KEY, "test-id");
      expect(loadCurrentSessionId()).toBe("test-id");
    });
  });

  describe("saveCurrentSessionId", () => {
    test("saves session ID to localStorage", () => {
      saveCurrentSessionId("my-session");
      expect(localStorage.getItem(CURRENT_SESSION_KEY)).toBe("my-session");
    });
  });

  describe("initializeState", () => {
    test("creates new session when none exist", () => {
      const { sessions, currentSession } = initializeState();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toBe(currentSession);
      expect(currentSession.title).toBe("New Chat");
    });

    test("restores existing session by ID", () => {
      const existingSessions: Session[] = [
        {
          id: "existing",
          title: "Existing Chat",
          messages: [],
          tokenCount: 100,
          createdAt: 123,
        },
      ];
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(existingSessions));
      localStorage.setItem(CURRENT_SESSION_KEY, "existing");

      const { sessions, currentSession } = initializeState();
      expect(sessions).toEqual(existingSessions);
      expect(currentSession.id).toBe("existing");
      expect(currentSession.title).toBe("Existing Chat");
    });

    test("creates new session when current ID not found", () => {
      const existingSessions: Session[] = [
        {
          id: "other",
          title: "Other Chat",
          messages: [],
          tokenCount: 0,
          createdAt: 123,
        },
      ];
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(existingSessions));
      localStorage.setItem(CURRENT_SESSION_KEY, "nonexistent");

      const { sessions, currentSession } = initializeState();
      expect(sessions).toHaveLength(2);
      expect(currentSession.title).toBe("New Chat");
      expect(sessions[0]).toBe(currentSession);
    });
  });
});
