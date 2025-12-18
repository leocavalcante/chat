import type { Session, Theme } from "../types";
import { ThemeToggle } from "./ThemeToggle";

type SidebarProps = {
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  loadingSessions: Set<string>;
  unreadSessions: Set<string>;
  theme: Theme;
  onToggleTheme: () => void;
};

export function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  loadingSessions,
  unreadSessions,
  theme,
  onToggleTheme,
}: SidebarProps) {
  return (
    <div className="w-64 bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col">
      <div className="p-3 flex items-center gap-2">
        <button
          onClick={onNewSession}
          className="flex-1 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 px-3 py-2 my-0.5 rounded-lg cursor-pointer ${
              session.id === currentSessionId
                ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/50"
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            {loadingSessions.has(session.id) && (
              <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-pulse flex-shrink-0" />
            )}
            {!loadingSessions.has(session.id) && unreadSessions.has(session.id) && (
              <span className="w-1.5 h-1.5 bg-[var(--text-primary)] rounded-full flex-shrink-0" />
            )}
            <span className="flex-1 truncate text-sm">{session.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
