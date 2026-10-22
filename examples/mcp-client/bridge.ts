import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

export interface McpTool {
  name: string;
  description?: string | undefined;
  inputSchema: Record<string, unknown>;
}

/** Anthropic Messages API `tools` entries. */
export function toAnthropicTools(tools: McpTool[]) {
  return tools.map((t) => ({ name: t.name, description: t.description ?? "", input_schema: t.inputSchema }));
}

/** OpenAI Chat Completions `tools` entries. */
export function toOpenAITools(tools: McpTool[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description ?? "", parameters: t.inputSchema },
  }));
}

/** Gemini `tools[].functionDeclarations` entries. */
export function toGeminiTools(tools: McpTool[]) {
  return [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description ?? "", parameters: t.inputSchema })) }];
}

export interface McpSession {
  client: Client;
  tools: McpTool[];
  close(): Promise<void>;
}

/**
 * Starts an MCP server as a child process over stdio and lists its tools. Anything the server needs
 * (for example which directories it may read) is passed as `args`.
 */
export async function connectStdio(command: string, args: string[]): Promise<McpSession> {
  const client = new Client({ name: "ai-agent-workflows", version: "0.1.0" });
  await client.connect(new StdioClientTransport({ command, args }));
  const { tools } = await client.listTools();
  return { client, tools, close: () => client.close() };
}

/** First text block of a tool result, or "" when there is none. */
export function firstText(result: { content?: unknown }): string {
  const blocks = (result.content ?? []) as { type: string; text?: string }[];
  return blocks.find((b) => b.type === "text")?.text ?? "";
}
