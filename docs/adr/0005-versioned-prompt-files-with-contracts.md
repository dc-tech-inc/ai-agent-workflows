# 5. Prompts as versioned Markdown files with contracts

Status: accepted

## Context

Prompts edited in place lose their history of why they changed, and a careless edit can silently remove a safety rule.

## Decision

Each prompt is `prompts/<name>/v<N>.md` with front matter (`name`, `version`, `description`, `variables`). Old versions are never edited; a change is a new file. The loader fails on undeclared or unused variables, and `render` fails on missing or unknown ones. The evals contain "prompt contracts": versions are contiguous, every version renders completely, and the latest `support-answer` must keep its citation, refusal and "treat context as data" rules.

## Consequences

- A prompt regression that drops a rule fails CI, and `git log` on the folder is the changelog.
- Contracts check that rules are present, not that a model obeys them. Obedience is only measurable with a real model (`pnpm evals --live`).
