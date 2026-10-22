import { createInterface } from "node:readline/promises";
import { createProvider, loadDotEnv } from "../src/llm/index.js";
import { createBot } from "./bot.js";
import { loadIndex } from "./rag.js";

loadDotEnv();
const provider = createProvider();
const bot = createBot({ provider, index: loadIndex() });
console.log(`Fernwood Backup support bot (provider: ${provider.name}, prompt: ${bot.prompt.name} v${bot.prompt.version}).`);
console.log("Ask a question, or press Ctrl+C to quit.");

async function show(question: string): Promise<void> {
  const result = await bot.ask(question);
  console.log(`\n${result.answer}`);
  if (result.sources.length > 0) console.log(`sources: ${result.sources.map((s) => s.id).join(", ")}`);
}

const initial = process.argv.slice(2).join(" ");
if (initial) {
  await show(initial);
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  for (;;) {
    const question = (await rl.question("\n> ")).trim();
    if (question) await show(question);
  }
}
