import type { ChatMessage, FetchLike, LLMProvider } from "./types.js";

/**
 * Optional real providers, plain `fetch` against each vendor's documented HTTP API (no SDK dependency).
 * They are NOT exercised against the live services in this repository: the unit tests only check the request
 * shape and response parsing with an injected `fetch`. See README, "Limitations".
 */
export interface RealProviderOptions {
  apiKey: string;
  model: string;
  fetch?: FetchLike;
  baseUrl?: string;
}

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

async function post(doFetch: FetchLike, url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const response = await doFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`LLM request failed with HTTP ${response.status}`);
  return response.json();
}

function split(messages: ChatMessage[]): { system: string; turns: { role: "user" | "assistant"; content: string }[] } {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const turns = messages.flatMap((m) => (m.role === "system" ? [] : [{ role: m.role, content: m.content }]));
  return { system, turns };
}

/** Anthropic Messages API: POST /v1/messages. */
export function anthropicProvider(options: RealProviderOptions): LLMProvider {
  const doFetch = options.fetch ?? defaultFetch;
  return {
    name: "anthropic",
    async complete(messages) {
      const { system, turns } = split(messages);
      const data = (await post(
        doFetch,
        `${options.baseUrl ?? "https://api.anthropic.com"}/v1/messages`,
        { "x-api-key": options.apiKey, "anthropic-version": "2023-06-01" },
        { model: options.model, max_tokens: 1024, system, messages: turns },
      )) as { content?: { type: string; text?: string }[] };
      return (data.content ?? []).map((block) => (block.type === "text" ? (block.text ?? "") : "")).join("");
    },
  };
}

/** OpenAI Chat Completions API: POST /v1/chat/completions (also OpenAI-compatible servers via baseUrl). */
export function openaiProvider(options: RealProviderOptions): LLMProvider {
  const doFetch = options.fetch ?? defaultFetch;
  return {
    name: "openai",
    async complete(messages) {
      const data = (await post(
        doFetch,
        `${options.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`,
        { authorization: `Bearer ${options.apiKey}` },
        { model: options.model, messages },
      )) as { choices?: { message?: { content?: string | null } }[] };
      return data.choices?.[0]?.message?.content ?? "";
    },
  };
}

/** Gemini API: POST /v1beta/models/{model}:generateContent. */
export function geminiProvider(options: RealProviderOptions): LLMProvider {
  const doFetch = options.fetch ?? defaultFetch;
  return {
    name: "gemini",
    async complete(messages) {
      const { system, turns } = split(messages);
      const base = options.baseUrl ?? "https://generativelanguage.googleapis.com";
      const data = (await post(
        doFetch,
        `${base}/v1beta/models/${encodeURIComponent(options.model)}:generateContent`,
        { "x-goog-api-key": options.apiKey },
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
        },
      )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
    },
  };
}
