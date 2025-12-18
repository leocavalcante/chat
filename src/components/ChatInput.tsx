import type { Theme } from "../types";

type ChatInputProps = {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  theme: Theme;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

export function ChatInput({ input, setInput, onSend, disabled, theme, inputRef }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSend();
    }
  };

  return (
    <div className="border-t border-[var(--border-color)] p-4">
      <div className="max-w-3xl mx-auto flex gap-3">
        <input
          ref={inputRef}
          type="text"
          placeholder="Message..."
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--text-muted)] disabled:opacity-50"
        />
        <button
          onClick={onSend}
          disabled={disabled || !input.trim()}
          className={`px-4 py-3 rounded-xl text-sm font-medium disabled:cursor-not-allowed ${
            theme === "dark"
              ? "bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600"
              : "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
