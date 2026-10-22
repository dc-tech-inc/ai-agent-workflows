# 2. Plain `fetch` adapters, no vendor SDKs, no default model id

Status: accepted

## Context

Three vendors (Anthropic, OpenAI, Google) are supported as optional back ends. Their SDKs are large, change often, and each brings its own types and retry behaviour. This project needs one operation: send messages, get text back.

## Decision

Each adapter is about 20 lines of `fetch` against the documented HTTP endpoint, with the `fetch` function injectable so tests check the exact request shape and response parsing without a network. The model id has no default: `LLM_MODEL` must be set, so a retired model id can never be baked into the code.

## Consequences

- No vendor dependency to keep updated; the cost is that streaming, tool calling and retries are not implemented (listed in the roadmap).
- The request shapes follow the vendor documentation linked in the README, but they are only verified against that documentation, not against the live services.
