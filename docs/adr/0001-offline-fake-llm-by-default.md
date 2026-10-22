# 1. Offline fake LLM provider by default

Status: accepted

## Context

The repository must run, be tested and be evaluated in CI without an API key, without spending money and without sending anything to a third party. It must also be possible to point the same code at a real model.

## Decision

`LLMProvider` is a one-method interface. The default implementation, `FakeProvider`, is deterministic and extractive: it picks the best-matching sentences from the retrieved context and cites them. Real providers are opt-in through `.env` (`LLM_PROVIDER`).

## Consequences

- Unit tests and evals are fast, reproducible and free.
- The evals measure the pipeline around a model (retrieval, refusal, citation checks, prompt contracts), not the quality of any model. The README says so.
- A real model has not been run against this repository. Anyone who adds a key can run `pnpm evals --live` and will see numbers I have not seen.
