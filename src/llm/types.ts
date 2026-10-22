export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** The only thing the rest of the code knows about a model. */
export interface LLMProvider {
  readonly name: string;
  complete(messages: ChatMessage[]): Promise<string>;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
