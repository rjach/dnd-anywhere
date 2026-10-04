# Governance

DnD Anywhere is a small open-source project. This document says who decides what, and how that can change as the project grows.

## Roles

**Users** use the extension and report problems.

**Contributors** open issues, pull requests, adapters, translations and docs. Anyone can be a contributor.

**Maintainers** review and merge pull requests, triage issues, cut releases and moderate community spaces. Current maintainers:

| Name          | GitHub                             | Responsibilities                       |
| ------------- | ---------------------------------- | -------------------------------------- |
| Rojan Acharya | [@rjach](https://github.com/rjach) | Project lead, releases, store accounts |

## How decisions are made

- **Day to day:** lazy consensus. A pull request with one maintainer approval and passing CI can be merged.
- **Architecture and policy changes** (new permissions, new kinds of page interaction, privacy-relevant changes, major dependencies) are written up as an [architecture decision record](docs/adr/) and discussed in an issue for at least 7 days before acceptance.
- **Permission changes** need explicit agreement from the project lead (see [CONTRIBUTING.md](CONTRIBUTING.md#permission-changes)).
- If maintainers disagree, the project lead decides after hearing everyone out, and the reasoning is recorded in the issue.

## The privacy promise is part of governance

The commitments in the [privacy policy](https://rjach.github.io/dnd-anywhere/privacy/) (no data collection, no network requests, no remote code) cannot be changed by a pull request alone. Changing them requires an ADR, a public discussion of at least 30 days, a major version bump and a prominent notice to users.

## Becoming a maintainer

Contributors who have made sustained, high-quality contributions (code, reviews, triage or docs) over a few months can be invited by the existing maintainers. You can also ask. New maintainers start with triage and review rights.

## Releases and store access

Releases are cut by merging the release-please PR; publishing to stores requires approval in the `store-publish` GitHub environment. The goal is for **at least two maintainers** to hold access to each store account (via a Chrome Web Store group publisher, Microsoft Partner Center users, and AMO collaborators) so the project never depends on one person. Until there is a second maintainer, the project lead keeps recovery details for the store accounts in a secure location.

## Triage labels

`good first issue`, `help wanted`, `site-compat`, `adapter`, `resolver`, `a11y`, `i18n`, `privacy`, `needs-repro`, `blocked-upstream`, `wontfix: site blocks synthetic events`. Issues labeled `needs-repro` are closed after 30 days without a reproduction.

## Changing this document

Changes to governance follow the architecture/policy process above.
