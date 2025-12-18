import { marked } from "marked";
import type { Message, Theme } from "../types";
import { MessageBubble } from "./MessageBubble";
import { LoadingSpinner } from "./LoadingSpinner";

type MessageListProps = {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  theme: Theme;
  chatRef: React.RefObject<HTMLDivElement | null>;
};

export function MessageList({ messages, isLoading, streamingContent, theme, chatRef }: MessageListProps) {
  return (
    <div ref={chatRef} className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <p className="text-[var(--text-muted)] text-sm">Start a conversation</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} theme={theme} />
        ))}
        {isLoading && !streamingContent && <LoadingSpinner />}
        {streamingContent && (
          <div
            className={`animate-fade-up self-start max-w-[75%] prose prose-sm prose-p:leading-relaxed prose-p:my-2 prose-pre:border prose-code:before:content-none prose-code:after:content-none ${
              theme === "dark"
                ? "prose-invert prose-pre:bg-zinc-900 prose-pre:border-zinc-800 prose-code:text-zinc-300"
                : "prose-pre:bg-zinc-100 prose-pre:border-zinc-200 prose-code:text-zinc-700"
            }`}
            dangerouslySetInnerHTML={{ __html: marked.parse(streamingContent) as string }}
          />
        )}
      </div>
    </div>
  );
}
