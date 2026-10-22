import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { connectStdio, firstText, toAnthropicTools, toGeminiTools, toOpenAITools } from "../examples/mcp-client/bridge.js";

const tool = { name: "hygiene_check", description: "Checks things", inputSchema: { type: "object", properties: { path: { type: "string" } } } };

describe("tool definition mapping", () => {
  it("maps to Anthropic, OpenAI and Gemini shapes", () => {
    expect(toAnthropicTools([tool])).toEqual([{ name: "hygiene_check", description: "Checks things", input_schema: tool.inputSchema }]);
    expect(toOpenAITools([tool])).toEqual([
      { type: "function", function: { name: "hygiene_check", description: "Checks things", parameters: tool.inputSchema } },
    ]);
    expect(toGeminiTools([{ name: "t", inputSchema: {} }])).toEqual([{ functionDeclarations: [{ name: "t", description: "", parameters: {} }] }]);
  });

  it("firstText tolerates results without text", () => {
    expect(firstText({ content: [{ type: "image" }, { type: "text", text: "x" }] })).toBe("x");
    expect(firstText({})).toBe("");
  });
});

// Integration: needs the built dc-tech-inc/mcp-tool-server. CI builds it at a pinned commit; locally, set the variable.
const dist = process.env.MCP_TOOL_SERVER_DIST;
describe.skipIf(!dist)("against the real mcp-tool-server over stdio", () => {
  it("lists the five read-only tools and runs hygiene_check on a throwaway repo", async () => {
    const repo = mkdtempSync(join(tmpdir(), "mcp-target-"));
    execFileSync("git", ["init", "-q"], { cwd: repo });
    writeFileSync(join(repo, "README.md"), "# demo\n");
    const session = await connectStdio(process.execPath, [dist as string, repo]);
    try {
      expect(session.tools.map((t) => t.name).sort()).toEqual([
        "change_hotspots",
        "hygiene_check",
        "recent_activity",
        "repo_summary",
        "stale_branches",
      ]);
      expect(toAnthropicTools(session.tools)).toHaveLength(5);
      const result = await session.client.callTool({ name: "hygiene_check", arguments: { path: repo } });
      expect(result.isError).not.toBe(true);
      const report = JSON.parse(firstText(result)) as { score: number; checks: { id: string; passed: boolean }[] };
      expect(report.checks.find((c) => c.id === "readme")?.passed).toBe(true);
      expect(report.checks.find((c) => c.id === "license")?.passed).toBe(false);
    } finally {
      await session.close();
    }
  });
});
