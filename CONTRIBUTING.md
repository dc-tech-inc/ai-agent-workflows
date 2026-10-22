# Contributing

Thanks for taking a look. This is a small reference repository; focused changes are easiest to review.

## Setup

Node.js 24 and pnpm 11.

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm evals
```

## Rules of the road

- Branch from `main`, open a pull request, and keep one logical change per PR. Merges use a merge commit.
- Conventional commit messages: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`.
- Tests must run offline and deterministically: no real network, no real keys.
- Changing a prompt means adding a new version file (`prompts/<name>/vN.md`), not editing an old one, and keeping `pnpm evals` green.
- New evals go in `evals/cases.json`. If you lower a threshold to make a change pass, say why in the PR.
- Never commit secrets, personal data, or documentation copied from a product you do not own.
