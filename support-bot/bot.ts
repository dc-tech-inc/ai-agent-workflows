import { REFUSAL, type LLMProvider } from "../src/llm/index.js";
import { getPrompt, loadPrompts, render, type Prompt } from "../prompts/loader.js";
import { search, type Index } from "./rag.js";

export interface BotOptions {
  provider: LLMProvider;
  index: Index;
  /** Excerpts handed to the model. */
  k?: number;
  /** Below this best retrieval score the bot refuses without calling the model. */
  minScore?: number;
  /** Same for the share of query words found in the best chunk. */
  minOverlap?: number;
  prompt?: Prompt;
}

export interface Answer {
  answer: string;
  refused: boolean;
  reason?: "no-relevant-docs" | "model-refused" | "no-valid-citation";
  sources: { id: string; title: string; score: number }[];
}

/** Retrieved text is data: stop it from closing the `<context>` block or opening new tags. */
export function escapeContext(text: string): string {
  return text.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function createBot(options: BotOptions) {
  const { provider, index, k = 3, minScore = 0.12, minOverlap = 0.3 } = options;
  const prompt = options.prompt ?? getPrompt(loadPrompts(), "support-answer");

  return {
    prompt,
    async ask(question: string): Promise<Answer> {
      const hits = search(index, question, k);
      const sources = hits.map(({ chunk, score }) => ({ id: chunk.id, title: chunk.title, score }));
      const best = hits[0];
      if (!best || best.score < minScore || best.overlap < minOverlap) {
        return { answer: REFUSAL, refused: true, reason: "no-relevant-docs", sources: [] };
      }
      const context = hits.map(({ chunk }) => `[${chunk.id}] ${escapeContext(chunk.text)}`).join("\n");
      const content = render(prompt, { context, question: escapeContext(question) });
      const answer = (await provider.complete([{ role: "user", content }])).trim();
      if (answer === REFUSAL) return { answer, refused: true, reason: "model-refused", sources };
      const known = new Set(hits.map(({ chunk }) => chunk.id));
      const cited = [...answer.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1] as string);
      if (!cited.some((id) => known.has(id))) {
        // An answer that cites nothing we retrieved cannot be checked against the docs: do not show it.
        return { answer: REFUSAL, refused: true, reason: "no-valid-citation", sources };
      }
      return { answer, refused: false, sources };
    },
  };
}
