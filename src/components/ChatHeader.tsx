import type { Session, Theme } from "../types";

type ChatHeaderProps = {
  session: Session;
  maxTokens: number;
};

export function ChatHeader({ session, maxTokens }: ChatHeaderProps) {
  const percentage = ((session.tokenCount / maxTokens) * 100).toFixed(1);

  return (
    <header className="px-6 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
      <h1 className="text-sm font-medium text-[var(--text-secondary)]">{session.title}</h1>
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span>{session.tokenCount.toLocaleString()} tokens</span>
        <span>·</span>
        <span>{percentage}%</span>
      </div>
    </header>
  );
}
