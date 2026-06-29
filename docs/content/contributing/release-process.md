---
title: Release Process
---

# Release Process

Frappe keeps one development branch and one branch per supported major version. Knowing which branch your change belongs on is the main thing to get right when you contribute.

## Branches

- `develop` is where active development happens. The next major version is built here, and new features and most fixes are merged here first. You cannot commit to it directly; a pre-commit hook blocks that, so you work on a feature branch and open a pull request.
- `version-15`, `version-16`, and similar branches hold the released major versions. These get bug fixes and security patches, not new features.

You normally target `develop`. Maintainers decide what gets backported to the version branches.

## Backporting

Merged fixes are carried into the supported version branches by a backport bot. When a maintainer adds a backport label to your merged pull request, the bot opens a new pull request that cherry-picks your change onto the target version branch. This is why you usually only need to open one pull request against `develop`.

## Cutting releases

Releases are automated through GitHub Actions, not run by hand.

A scheduled workflow opens release pull requests once a week. For each supported version it creates a pull request from that version's hotfix branch into the version branch (for example `version-15-hotfix` into `version-15`). Merging that pull request is what publishes the release.

Tags and release notes are generated with [semantic-release](https://semantic-release.gitbook.io), which reads the Conventional Commit messages to work out the next version number and build the changelog. Because the version number is derived from commit types, writing correct commit messages matters. See the [Style Guide](/contributing/style-guide) for the rules.

When a release is published, another workflow builds the frontend assets and attaches them to the GitHub release so installs do not have to rebuild them.
