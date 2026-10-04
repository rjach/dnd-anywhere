# Security Policy

## Supported versions

Only the latest released version (the one in the browser stores) receives security fixes. Extensions update automatically, so most users are always on it.

## Reporting a vulnerability

**Please don't open a public issue for security problems.**

Report privately through [GitHub Private Vulnerability Reporting](https://github.com/rjach/dnd-anywhere/security/advisories/new), or email [hello@rojanacharya.com](mailto:hello@rojanacharya.com) with "SECURITY" in the subject.

Please include:

- what an attacker can do, and under which conditions (for example "a malicious page can…")
- steps to reproduce, ideally a minimal HTML page
- the extension version and browser

## What to expect

| Step                                       | Target          |
| ------------------------------------------ | --------------- |
| Acknowledge your report                    | within 72 hours |
| Initial assessment and severity            | within 7 days   |
| Fix or mitigation for high/critical issues | within 30 days  |

We'll keep you updated, credit you in the release notes and advisory unless you'd rather stay anonymous, and coordinate disclosure with you. We ask that you give us a reasonable time to ship a fix through the stores (store review can take several days) before disclosing.

## Scope

In scope:

- the extension (content scripts, MAIN-world capture shim, background, popup, options and welcome pages)
- the build and release pipeline (GitHub Actions, release artifacts)
- the website at rjach.github.io/dnd-anywhere

Out of scope:

- how third-party websites handle files after they receive them
- issues requiring a compromised browser or operating system
- the fact that pages can detect that a browser extension wrapped `HTMLElement.prototype.click` (documented in [docs/security-model.md](docs/security-model.md))

## Safe harbor

We won't pursue or support legal action against anyone who researches and reports in good faith under this policy: avoid privacy violations and service disruption, only test against your own accounts and data, and give us a chance to fix the issue before going public.

See [docs/security-model.md](docs/security-model.md) for the threat model.
