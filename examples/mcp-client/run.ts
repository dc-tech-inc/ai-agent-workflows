import { resolve } from "node:path";
import { connectStdio, firstText } from "./bridge.js";

// Usage: MCP_TOOL_SERVER_DIST=/abs/path/to/mcp-tool-server/dist/index.js pnpm mcp-example [repo-to-inspect]
const dist = process.env.MCP_TOOL_SERVER_DIST;
if (!dist) {
  console.error("Set MCP_TOOL_SERVER_DIST to the built dist/index.js of dc-tech-inc/mcp-tool-server (see README).");
  process.exit(2);
}
const target = resolve(process.argv[2] ?? ".");

const session = await connectStdio(process.execPath, [dist, target]);
try {
  console.log(`tools: ${session.tools.map((t) => t.name).join(", ")}`);
  const result = await session.client.callTool({ name: "hygiene_check", arguments: { path: target } });
  console.log(`hygiene_check(${target}):`);
  console.log(firstText(result));
} finally {
  await session.close();
}
