// PreToolUse hook for Claude Code: deny a few shell commands that are hard to undo.
// Runs as `node block-destructive.ts` (Node 24 strips the types itself, no build step).
// It is a seatbelt, not a sandbox: a determined command can still be written around these patterns.

export interface HookInput {
  tool_name?: string;
  tool_input?: { command?: string };
}

const RULES: { pattern: RegExp; reason: string }[] = [
  { pattern: /\brm\s+(-\w*[rf]\w*\s+)+(\/|~|\$HOME)(\s|\/?$)/, reason: "recursive delete of / or the home directory" },
  { pattern: /\bgit\s+push\b[^|;&]*\s(--force|-f)(?![-\w])/, reason: "force push (use --force-with-lease and ask first)" },
  { pattern: /\bgit\s+reset\s+--hard\b/, reason: "git reset --hard discards uncommitted work" },
  { pattern: /\b(curl|wget)\b[^|;&]*\|\s*(sudo\s+)?(sh|bash|zsh)\b/, reason: "piping a download into a shell" },
  { pattern: /\bchmod\s+-R\s+0?777\b/, reason: "world-writable permissions" },
  { pattern: /\bdrop\s+(database|schema)\b/i, reason: "dropping a database or schema" },
];

/** Returns the reason to deny, or null to leave the decision to the normal permission flow. */
export function denyReason(input: HookInput): string | null {
  const command = input.tool_input?.command ?? "";
  return RULES.find((rule) => rule.pattern.test(command))?.reason ?? null;
}

export function decision(input: HookInput): object | null {
  const reason = denyReason(input);
  if (!reason) return null;
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Blocked by block-destructive hook: ${reason}`,
    },
  };
}

if (process.argv[1]?.endsWith("block-destructive.ts")) {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const result = decision(JSON.parse(raw) as HookInput);
  if (result) process.stdout.write(JSON.stringify(result));
}
