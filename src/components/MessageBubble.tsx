import { marked } from "marked";
import type { Message, Theme } from "../types";

type MessageBubbleProps = Message & {
  theme: Theme;
};

export function MessageBubble({ role, content, theme }: MessageBubbleProps) {
  if (role === "assistant") {
    return (
      <div
        className={`animate-fade-up self-start max-w-[75%] prose prose-sm prose-p:leading-relaxed prose-p:my-2 prose-pre:border prose-code:before:content-none prose-code:after:content-none ${
          theme === "dark"
            ? "prose-invert prose-pre:bg-zinc-900 prose-pre:border-zinc-800 prose-code:text-zinc-300"
            : "prose-pre:bg-zinc-100 prose-pre:border-zinc-200 prose-code:text-zinc-700"
        }`}
        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
      />
    );
  }
  return (
    <div className="animate-fade-up self-end bg-[var(--bg-secondary)] rounded-2xl px-4 py-2.5 max-w-[75%] text-[var(--text-primary)]">
      {content}
    </div>
  );
}
