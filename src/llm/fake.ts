import { tokenize } from "../text.js";
import type { ChatMessage, LLMProvider } from "./types.js";

export const REFUSAL = "I could not find that in the documentation, so I would rather not guess.";

/**
 * Deterministic offline stand-in for a model: it answers extractively from the `<context>` block (tags on their own lines) of the last
 * user message, citing the chunk ids it used. It tests the pipeline around a model, not model quality.
 */
export class FakeProvider implements LLMProvider {
  readonly name = "fake";

  async complete(messages: ChatMessage[]): Promise<string> {
    const prompt = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const question = /^<question>\n([\s\S]*?)\n<\/question>$/m.exec(prompt)?.[1]?.trim() ?? "";
    const wanted = new Set(tokenize(question));
    const sentences: { id: string; sentence: string; words: Set<string> }[] = [];
    for (const line of (/^<context>\n([\s\S]*?)\n<\/context>$/m.exec(prompt)?.[1] ?? "").split("\n")) {
      const match = /^\[([^\]]+)\] (.*)$/.exec(line.trim());
      if (!match?.[1] || !match[2]) continue;
      for (const sentence of match[2].split(/(?<=[.!?])\s+/)) {
        sentences.push({ id: match[1], sentence, words: new Set(tokenize(sentence)) });
      }
    }
    // Words that appear in few sentences say more about which one answers the question (inverse document frequency).
    const weight = (word: string) => Math.log(1 + sentences.length / sentences.filter((s) => s.words.has(word)).length);
    const scored = sentences
      .map((s) => ({ ...s, score: [...wanted].filter((w) => s.words.has(w)).reduce((sum, w) => sum + weight(w), 0) }))
      .filter((s) => s.score > 0);
    const best = scored.sort((a, b) => b.score - a.score).slice(0, 2);
    if (best.length === 0) return REFUSAL;
    return best.map(({ sentence, id }) => `${sentence} [${id}]`).join(" ");
  }
}
