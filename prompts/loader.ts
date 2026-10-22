import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Prompt {
  name: string;
  version: number;
  description: string;
  variables: string[];
  body: string;
}

export const PROMPTS_DIR = dirname(fileURLToPath(import.meta.url));

/** Parses `---` front matter (`key: value` lines) followed by the prompt body. */
export function parsePrompt(source: string, origin = "prompt"): Prompt {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source);
  if (!match?.[1] || match[2] === undefined) throw new Error(`${origin}: missing front matter`);
  const meta = new Map<string, string>();
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^(\w+):\s*(.*)$/.exec(line);
    if (pair?.[1]) meta.set(pair[1], (pair[2] ?? "").trim());
  }
  const name = meta.get("name");
  const version = Number(meta.get("version"));
  if (!name || !Number.isInteger(version) || version < 1) {
    throw new Error(`${origin}: name and integer version are required`);
  }
  const variables = (meta.get("variables") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const body = match[2].trim();
  const used = new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] as string));
  for (const variable of used) {
    if (!variables.includes(variable)) throw new Error(`${origin}: {{${variable}}} is used but not declared`);
  }
  for (const variable of variables) {
    if (!used.has(variable)) throw new Error(`${origin}: variable "${variable}" is declared but never used`);
  }
  return { name, version, description: meta.get("description") ?? "", variables, body };
}

/** Loads every `<dir>/<name>/v<N>.md`, sorted by name then version. */
export function loadPrompts(dir = PROMPTS_DIR): Prompt[] {
  const prompts: Prompt[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const file of readdirSync(join(dir, entry.name))) {
      if (!/^v\d+\.md$/.test(file)) continue;
      const prompt = parsePrompt(readFileSync(join(dir, entry.name, file), "utf8"), `${entry.name}/${file}`);
      if (prompt.name !== entry.name || `v${prompt.version}.md` !== file) {
        throw new Error(`${entry.name}/${file}: front matter does not match its path`);
      }
      prompts.push(prompt);
    }
  }
  return prompts.sort((a, b) => a.name.localeCompare(b.name) || a.version - b.version);
}

/** The requested version, or the highest one when `version` is omitted. */
export function getPrompt(prompts: Prompt[], name: string, version?: number): Prompt {
  const found = prompts.filter((p) => p.name === name && (version === undefined || p.version === version));
  const prompt = found.sort((a, b) => b.version - a.version)[0];
  if (!prompt) throw new Error(`No prompt "${name}"${version === undefined ? "" : ` v${version}`}`);
  return prompt;
}

/** Substitutes `{{variable}}`. Missing and unknown variables are errors, never silently empty. */
export function render(prompt: Prompt, values: Record<string, string>): string {
  for (const key of Object.keys(values)) {
    if (!prompt.variables.includes(key)) throw new Error(`${prompt.name} v${prompt.version}: unknown variable "${key}"`);
  }
  return prompt.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`${prompt.name} v${prompt.version}: missing variable "${key}"`);
    return value;
  });
}
