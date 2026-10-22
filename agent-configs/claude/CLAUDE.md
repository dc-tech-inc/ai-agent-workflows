# Project instructions for Claude Code

A generic starting point. Copy it to the root of a TypeScript project as `CLAUDE.md` and edit every line that does not match your repository.

## Commands

- Install: `pnpm install`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test` (single file: `pnpm vitest run path/to/file.test.ts`)
- Run all of lint, typecheck and test before saying a task is finished.

## Conventions

- TypeScript with `strict` on. No `any`; use `unknown` and narrow.
- Match the style of the surrounding code before introducing a new pattern or dependency.
- Comments explain why, not what. Keep them rare.
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), one logical change per commit.

## Working rules

- Read the code around a change before editing it. Reuse existing helpers.
- Write or update a test for every behaviour change. A bug fix starts with a failing test.
- Never commit secrets. Configuration comes from environment variables, and `.env.example` lists them with placeholder values.
- Ask before deleting files, rewriting history, force pushing, or adding a dependency.
- When something is unclear, say what you assumed instead of guessing silently.

## Done means

Tests pass, lint and typecheck are clean, the change is described in the PR in plain language, and anything left undone is listed.
