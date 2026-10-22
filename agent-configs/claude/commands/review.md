---
description: Review the current branch for correctness, security and missing tests
---
Review the changes on this branch against the default branch.

1. Run `git diff --stat` and `git diff` to see what changed.
2. For each changed file, check for: logic errors and unhandled edge cases, input validation at trust boundaries, secrets or personal data, error handling that swallows failures, and behaviour changes without a test.
3. Report findings as a list ordered by severity. For each one give the file and line, what is wrong, and a concrete fix.
4. End with what you did not check. Do not edit any file.

Focus area, if provided: $ARGUMENTS
