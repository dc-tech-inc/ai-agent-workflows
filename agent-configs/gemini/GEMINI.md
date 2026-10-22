# GEMINI.md

Context file for Gemini CLI. A generic starting point: edit every line that does not match your project.

## Project

A TypeScript project managed with pnpm. Source in `src/`, tests in `test/`.

## Commands

- `pnpm lint`, `pnpm typecheck`, `pnpm test`: run all three before declaring a task done.

## How to work here

- Read the surrounding code first and match its style.
- Keep TypeScript `strict` clean; avoid `any`.
- Add or update tests for every behaviour change. Tests run offline and are deterministic.
- Use conventional commit messages.

## Do not

- Read or print `.env` files, tokens or private keys.
- Run destructive commands or force push without asking first.
- Add dependencies without saying why.
