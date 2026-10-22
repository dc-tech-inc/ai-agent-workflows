import { FakeProvider } from "./fake.js";
import { anthropicProvider, geminiProvider, openaiProvider } from "./real.js";
import type { LLMProvider } from "./types.js";

export type { ChatMessage, LLMProvider } from "./types.js";
export { FakeProvider, REFUSAL } from "./fake.js";

/**
 * Picks a provider from the environment. The default is the offline fake: nothing leaves the machine and no key
 * is needed. A real provider needs LLM_PROVIDER, LLM_API_KEY and LLM_MODEL (there is deliberately no default
 * model id, so a stale one can never be baked in).
 */
export function createProvider(env: Record<string, string | undefined> = process.env): LLMProvider {
  const kind = (env.LLM_PROVIDER ?? "fake").toLowerCase();
  if (kind === "fake") return new FakeProvider();
  const apiKey = env.LLM_API_KEY;
  const model = env.LLM_MODEL;
  if (!apiKey || !model) throw new Error(`LLM_PROVIDER=${kind} needs LLM_API_KEY and LLM_MODEL (see .env.example)`);
  const options = { apiKey, model, ...(env.LLM_BASE_URL ? { baseUrl: env.LLM_BASE_URL } : {}) };
  if (kind === "anthropic") return anthropicProvider(options);
  if (kind === "openai") return openaiProvider(options);
  if (kind === "gemini") return geminiProvider(options);
  throw new Error(`Unknown LLM_PROVIDER "${kind}". Use fake, anthropic, openai or gemini.`);
}

/** Loads ./.env when present (Node's built-in loader; never overrides variables already set). */
export function loadDotEnv(path = ".env"): void {
  try {
    process.loadEnvFile(path);
  } catch {
    /* no .env file: the offline defaults apply */
  }
}
