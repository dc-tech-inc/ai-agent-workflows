# AGENTS.md

Instructions for coding agents working in this repository. `AGENTS.md` is read by several tools (Codex CLI among them); a generic starting point, edit every line that does not match your project.

## Setup and checks

- Install dependencies: `pnpm install`
- Lint: `pnpm lint` · Typecheck: `pnpm typecheck` · Test: `pnpm test`
- All three must pass before you finish.

## Code style

- TypeScript, `strict` mode, no `any`.
- Follow the patterns already in the file you are editing; do not add a dependency for something a few lines can do.
- Keep functions small and named for what they do. Prefer early returns over deep nesting.

## Tests

- Every behaviour change comes with a test. For a bug fix, write the failing test first.
- Tests must be deterministic and run offline: no real network, no real API keys, no wall-clock dependence.

## Safety

- Never read, print or commit `.env` files, tokens or private keys. Use `.env.example` for placeholders.
- Do not run destructive commands (`rm -rf`, `git reset --hard`, force pushes, dropping databases) without asking.
- Keep changes scoped to the task. Mention unrelated problems instead of fixing them.

## Pull requests

- Branch from the default branch, use conventional commit messages, and describe what changed, why, and how you verified it.
