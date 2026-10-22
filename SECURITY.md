# Security policy

## Supported versions

This repository is a reference project without versioned releases. Only the `main` branch is maintained.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private vulnerability reporting instead: open the **Security** tab of this repository and choose **Report a vulnerability**. You will get an acknowledgement within 5 business days.

## Scope notes

- The default configuration runs offline and sends nothing anywhere. The optional real LLM providers send prompts and retrieved documentation excerpts to the vendor you configure; do not point them at confidential documents unless that vendor's terms allow it.
- API keys belong in `.env` (git-ignored) or your secret manager, never in the repository. CI scans the working tree and the full history for secrets.
- `agent-configs/` contains example configuration and a deny-list hook. The hook is a seatbelt against accidents, not a sandbox.
