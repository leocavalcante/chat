export function LoadingSpinner() {
  return (
    <div className="self-start flex gap-1.5 px-4 py-3 animate-fade-up">
      <span className="typing-dot w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" />
      <span className="typing-dot w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" />
      <span className="typing-dot w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full" />
    </div>
  );
}
