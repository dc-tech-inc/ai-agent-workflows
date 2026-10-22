import { describe, expect, it } from "vitest";
import { formatReport, loadCases, promptContracts, runEvals } from "../evals/evals.js";
import { FakeProvider, REFUSAL, type LLMProvider } from "../src/llm/index.js";
import { loadPrompts, parsePrompt } from "../prompts/loader.js";

describe("offline evals", () => {
  it("pass with the fake provider, which is what CI gates on", async () => {
    const result = await runEvals({ provider: new FakeProvider() });
    expect(formatReport(result)).toContain("All evals passed.");
    expect(result.passed).toBe(true);
  });

  it("fail loudly when the model is useless", async () => {
    const mute: LLMProvider = { name: "mute", complete: async () => REFUSAL };
    const result = await runEvals({ provider: mute });
    expect(result.passed).toBe(false);
    const report = formatReport(result);
    expect(report).toContain("FAIL  answer contains expected facts");
    expect(report).toContain("Evals FAILED.");
  });

  it("have a case file with answerable and out-of-scope questions", () => {
    const cases = loadCases();
    expect(cases.answerable.length).toBeGreaterThanOrEqual(15);
    expect(cases.outOfScope.length).toBeGreaterThanOrEqual(3);
  });
});

describe("prompt contracts", () => {
  it("pass on the shipped library", () => {
    expect(promptContracts(loadPrompts())).toMatchObject({ passed: true, failures: [] });
  });

  it("catch a lost safety phrase and a version gap", () => {
    const weak = parsePrompt("---\nname: support-answer\nversion: 4\nvariables: context, question\n---\n{{context}} {{question}}");
    const metric = promptContracts([...loadPrompts(), weak]);
    expect(metric.passed).toBe(false);
    expect(metric.failures).toEqual(
      expect.arrayContaining(["support-answer: versions are not contiguous from 1", 'support-answer: latest version lost "ONLY"']),
    );
  });
});
