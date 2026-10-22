# 4. Consume the existing mcp-tool-server instead of writing another MCP server

Status: accepted

## Context

`dc-tech-inc/mcp-tool-server` already is a tested, read-only MCP server (five tools, in-memory and stdio tests). A second server in this repository would duplicate it and dilute both.

## Decision

This repository is an MCP **client** of that server. `examples/mcp-client` starts it over stdio, lists its tools, converts their JSON schemas to the tool formats of the Anthropic, OpenAI and Gemini APIs, and calls one. CI clones the server at a pinned commit, builds it, and runs an integration test against the real process.

## Consequences

- The integration test is real, not mocked. It is skipped locally unless `MCP_TOOL_SERVER_DIST` is set.
- The pinned commit has to be bumped deliberately when the server changes; the CI log shows which commit was tested.
- The conversion functions only translate tool definitions. A full agent loop (model calls a tool, result goes back) is not implemented and is on the roadmap.
