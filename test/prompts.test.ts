import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPrompt, loadPrompts, parsePrompt, render } from "../prompts/loader.js";

const valid = "---\nname: demo\nversion: 1\ndescription: d\nvariables: a\n---\nHello {{a}}";

describe("parsePrompt", () => {
  it("reads front matter and body", () => {
    expect(parsePrompt(valid)).toEqual({ name: "demo", version: 1, description: "d", variables: ["a"], body: "Hello {{a}}" });
  });

  it("rejects a missing header, a bad version, and undeclared or unused variables", () => {
    expect(() => parsePrompt("no header")).toThrow(/front matter/);
    expect(() => parsePrompt("---\nname: x\nversion: zero\n---\nbody")).toThrow(/integer version/);
    expect(() => parsePrompt("---\nname: x\nversion: 1\nvariables: a\n---\n{{b}}")).toThrow(/not declared/);
    expect(() => parsePrompt("---\nname: x\nversion: 1\nvariables: a\n---\nbody")).toThrow(/never used/);
  });
});

describe("render", () => {
  const prompt = parsePrompt(valid);
  it("substitutes variables", () => expect(render(prompt, { a: "world" })).toBe("Hello world"));
  it("fails on missing and unknown variables", () => {
    expect(() => render(prompt, {})).toThrow(/missing variable "a"/);
    expect(() => render(prompt, { a: "x", b: "y" })).toThrow(/unknown variable "b"/);
  });
});

describe("library", () => {
  it("loads the shipped prompts, versions sorted", () => {
    const prompts = loadPrompts();
    expect(prompts.map((p) => `${p.name}@${p.version}`)).toEqual([
      "classify-intent@1",
      "summarize-ticket@1",
      "support-answer@1",
      "support-answer@2",
    ]);
  });

  it("getPrompt returns the latest unless a version is pinned", () => {
    const prompts = loadPrompts();
    expect(getPrompt(prompts, "support-answer").version).toBe(2);
    expect(getPrompt(prompts, "support-answer", 1).version).toBe(1);
    expect(() => getPrompt(prompts, "support-answer", 9)).toThrow(/No prompt/);
  });

  it("rejects a file whose front matter disagrees with its path", () => {
    const dir = mkdtempSync(join(tmpdir(), "prompts-"));
    mkdirSync(join(dir, "demo"));
    writeFileSync(join(dir, "demo", "v2.md"), valid);
    expect(() => loadPrompts(dir)).toThrow(/does not match its path/);
  });
});
