export type Theme = "dark" | "light";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type Session = {
  id: string;
  title: string;
  messages: Message[];
  tokenCount: number;
  createdAt: number;
};
