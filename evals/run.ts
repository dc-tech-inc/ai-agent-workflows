import { createProvider, loadDotEnv } from "../src/llm/index.js";
import { formatReport, runEvals } from "./evals.js";

// Offline by default: the fake provider, no network, deterministic. `--live` uses the provider from .env.
const live = process.argv.includes("--live");
if (live) loadDotEnv();
const provider = live ? createProvider() : createProvider({});
console.log(`provider: ${provider.name}\n`);
const result = await runEvals({ provider });
console.log(formatReport(result));
process.exitCode = result.passed ? 0 : 1;
