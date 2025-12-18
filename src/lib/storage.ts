import type { Theme, Session } from "../types";

export const MAX_TOKENS = 200000;
export const SESSIONS_KEY = "chat_sessions";
export const CURRENT_SESSION_KEY = "chat_current_session";
export const THEME_KEY = "chat_theme";

export function loadTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function saveTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function createNewSession(): Session {
  return {
    id: generateId(),
    title: "New Chat",
    messages: [],
    tokenCount: 0,
    createdAt: Date.now(),
  };
}

export function loadSessions(): Session[] {
  try {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load sessions:", e);
  }
  return [];
}

export function saveSessions(sessions: Session[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save sessions:", e);
  }
}

export function loadCurrentSessionId(): string | null {
  return localStorage.getItem(CURRENT_SESSION_KEY);
}

export function saveCurrentSessionId(id: string) {
  localStorage.setItem(CURRENT_SESSION_KEY, id);
}

export function initializeState(): { sessions: Session[]; currentSession: Session } {
  let sessions = loadSessions();
  const currentId = loadCurrentSessionId();
  let currentSession = sessions.find((s) => s.id === currentId);

  if (!currentSession) {
    currentSession = createNewSession();
    sessions = [currentSession, ...sessions];
    saveSessions(sessions);
    saveCurrentSessionId(currentSession.id);
  }

  return { sessions, currentSession };
}
