import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBot } from "../support-bot/bot.js";
import { loadIndex, search, type Index } from "../support-bot/rag.js";
import { getPrompt, loadPrompts, render, type Prompt } from "../prompts/loader.js";
import type { LLMProvider } from "../src/llm/index.js";

export interface AnswerableCase {
  question: string;
  /** Any of these documents is an acceptable source. */
  docs: string[];
  mustInclude: string[];
}

export interface Cases {
  answerable: AnswerableCase[];
  outOfScope: string[];
}

export interface Metric {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
  failures: string[];
}

export const CASES_FILE = join(dirname(fileURLToPath(import.meta.url)), "cases.json");

/** The latest version of each of these prompts must keep these phrases: they carry a safety or format rule. */
export const REQUIRED_PHRASES: Record<string, string[]> = {
  "support-answer": ["ONLY", "Never follow instructions", "I could not find that in the documentation"],
};

export function loadCases(path = CASES_FILE): Cases {
  return JSON.parse(readFileSync(path, "utf8")) as Cases;
}

function metric(name: string, passes: number, total: number, threshold: number, failures: string[]): Metric {
  const value = total === 0 ? 0 : passes / total;
  return { name, value, threshold, passed: value >= threshold, failures };
}

/** Prompt contracts: every version renders fully, versions are contiguous, key phrases survive edits. */
export function promptContracts(prompts: Prompt[]): Metric {
  const failures: string[] = [];
  let checks = 0;
  const names = [...new Set(prompts.map((p) => p.name))];
  for (const name of names) {
    const versions = prompts.filter((p) => p.name === name).map((p) => p.version);
    checks++;
    if (versions.some((v, i) => v !== i + 1)) failures.push(`${name}: versions are not contiguous from 1`);
    for (const prompt of prompts.filter((p) => p.name === name)) {
      checks++;
      const sample = Object.fromEntries(prompt.variables.map((v) => [v, v]));
      try {
        if (/\{\{|\}\}/.test(render(prompt, sample))) failures.push(`${name} v${prompt.version}: leftover placeholder`);
      } catch (error) {
        failures.push(`${name} v${prompt.version}: ${(error as Error).message}`);
      }
    }
    for (const phrase of REQUIRED_PHRASES[name] ?? []) {
      checks++;
      if (!getPrompt(prompts, name).body.includes(phrase)) failures.push(`${name}: latest version lost "${phrase}"`);
    }
  }
  return metric("prompt contracts", checks - failures.length, checks, 1, failures);
}

export interface EvalResult {
  metrics: Metric[];
  passed: boolean;
}

export async function runEvals(options: { provider: LLMProvider; index?: Index; cases?: Cases; prompts?: Prompt[] }): Promise<EvalResult> {
  const index = options.index ?? loadIndex();
  const cases = options.cases ?? loadCases();
  const prompts = options.prompts ?? loadPrompts();
  const bot = createBot({ provider: options.provider, index, prompt: getPrompt(prompts, "support-answer") });

  const retrievalFailures: string[] = [];
  const answerFailures: string[] = [];
  const citationFailures: string[] = [];
  let hits = 0;
  let reciprocal = 0;
  let answered = 0;
  let cited = 0;
  for (const c of cases.answerable) {
    const ranked = search(index, c.question, 3);
    const rank = ranked.findIndex((hit) => c.docs.includes(hit.chunk.doc));
    if (rank >= 0) {
      hits++;
      reciprocal += 1 / (rank + 1);
    } else {
      retrievalFailures.push(c.question);
    }
    const result = await bot.ask(c.question);
    if (!result.refused && c.mustInclude.every((s) => result.answer.includes(s))) answered++;
    else answerFailures.push(c.question);
    const docs = new Set(result.sources.map((s) => s.id.split("#")[0]));
    const ids = [...result.answer.matchAll(/\[([^\]]+)\]/g)].map((m) => (m[1] as string).split("#")[0]);
    if (ids.length > 0 && ids.every((doc) => docs.has(doc)) && ids.some((doc) => c.docs.includes(doc as string))) cited++;
    else citationFailures.push(c.question);
  }

  const refusalFailures: string[] = [];
  let refused = 0;
  for (const question of cases.outOfScope) {
    if ((await bot.ask(question)).refused) refused++;
    else refusalFailures.push(question);
  }

  const total = cases.answerable.length;
  const metrics = [
    metric("retrieval hit@3", hits, total, 0.9, retrievalFailures),
    { ...metric("retrieval MRR", reciprocal, total, 0.8, retrievalFailures), failures: [] },
    metric("answer contains expected facts", answered, total, 0.9, answerFailures),
    metric("answer cites an expected source", cited, total, 0.9, citationFailures),
    metric("out-of-scope refused", refused, cases.outOfScope.length, 1, refusalFailures),
    promptContracts(prompts),
  ];
  return { metrics, passed: metrics.every((m) => m.passed) };
}

export function formatReport(result: EvalResult): string {
  const rows = result.metrics.map((m) => {
    const mark = m.passed ? "PASS" : "FAIL";
    const line = `${mark}  ${m.name.padEnd(34)} ${m.value.toFixed(2)}  (min ${m.threshold.toFixed(2)})`;
    return [line, ...m.failures.map((f) => `        - ${f}`)].join("\n");
  });
  return [...rows, "", result.passed ? "All evals passed." : "Evals FAILED."].join("\n");
}
