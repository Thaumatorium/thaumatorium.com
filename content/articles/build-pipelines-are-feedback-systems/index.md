---
title: "Build Pipelines Are Feedback Systems"
description: "A practical way to think about build pipelines: fast feedback, deterministic builds, and fewer broken releases."
publishDate: 2026-04-09T20:00:00+02:00
lastmod: 2026-04-09T20:00:00+02:00
layout: article
draft: true
---

When people say "build pipeline", they often mean a YAML file in CI.

That is too narrow.

A build pipeline is really a _feedback system_ that turns a code change into confidence. The pipeline takes source code,
runs a sequence of checks and transformations, and answers a simple question:

> "Is this change safe enough to move forward?"

That framing matters, because it changes how you design the pipeline. If you treat it as ceremony, you get a slow,
fragile pile of jobs that everyone resents. If you treat it as a feedback system, you start optimizing for signal,
speed, and trust.

## What a Build Pipeline Actually Does

At a high level, a pipeline usually does some mix of the following:

1. Validate the source code.
2. Build the application or artifact.
3. Run automated checks.
4. Package the result.
5. Publish or deploy it somewhere.

That sounds obvious, but the important point is that each stage should reduce uncertainty.

For example:

- A formatter reduces style noise.
- A linter catches suspicious code before review.
- Unit tests verify local behavior.
- Integration tests verify system behavior.
- A production build proves the artifact can actually be created.
- A deployment step proves the build is not just valid, but usable.

If a stage does not reduce uncertainty, it is probably cargo cult.

## The Four Properties of a Good Pipeline

### 1. It is fast

Fast feedback changes behavior. If developers get results in 2 minutes, they stay in flow. If they get results in 25
minutes, they context-switch, stack up branches, and stop trusting CI as part of their normal loop.

Speed is not cosmetic. It is a design requirement.

Good ways to improve speed:

- run cheap checks early
- fail fast
- parallelize independent jobs
- cache dependencies carefully
- avoid rebuilding the same artifact multiple times
- run the smallest useful test set for pull requests, and the broader suite later

### 2. It is deterministic

A pipeline should produce the same result from the same input.

If the same commit passes on Monday and fails on Tuesday because a dependency floated, a remote service timed out, or a
test depends on the current clock, the pipeline stops being a source of truth.

Determinism usually means:

- pinned dependencies
- isolated environments
- reproducible build steps
- controlled test data
- minimized reliance on external systems

Flaky pipelines are worse than no pipeline, because they train people to ignore red builds.

### 3. It is scoped

Not every change deserves the same amount of scrutiny.

A typo in documentation should not trigger a full end-to-end matrix across five operating systems. A change in a shared
core library probably should trigger much more.

A good pipeline understands scope:

- docs-only changes run docs checks
- frontend-only changes skip unrelated backend work
- pull requests run fast confidence checks
- merges to main run broader verification
- releases run the full packaging and publishing flow

Scope is how you keep confidence high without making development miserable.

### 4. It is trustworthy

The output of the pipeline has to mean something.

If developers regularly merge with failing checks, rerun jobs until green without understanding the cause, or maintain a
huge list of "expected failures", then the pipeline no longer communicates confidence. It becomes background noise.

Trust usually comes from:

- clear failure messages
- stable tests
- explicit ownership
- visible artifacts
- a small number of meaningful gates

The pipeline should be opinionated enough that a green build is boring, and a red build is actionable.

## A Simple Mental Model

You can think of the pipeline as three layers:

### 1. Cheap local feedback

This is what should happen before code even leaves a developer machine:

- formatting
- linting
- type-checking
- fast unit tests

These checks should ideally run in seconds.

### 2. Pull request feedback

This is where CI answers: "Should another human spend time reviewing this?"

Typical examples:

- clean install
- build verification
- test suite for touched areas
- static analysis
- security scanning for obvious issues

This layer should still be fast enough to preserve momentum.

### 3. Release confidence

This is where the question changes from "Does this look okay?" to "Can we ship it safely?"

Typical examples:

- full integration suite
- end-to-end tests
- artifact signing
- versioning
- publishing containers or packages
- staged deployments

Not every commit needs the heaviest possible checks. That is why separating these layers helps.

## A Minimal Example

Here is a deliberately boring pipeline:

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/install-deps.sh
      - run: ./scripts/check-format.sh
      - run: ./scripts/lint.sh
      - run: ./scripts/test-unit.sh

  build:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/install-deps.sh
      - run: ./scripts/build.sh

  release:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/install-deps.sh
      - run: ./scripts/package.sh
      - run: ./scripts/deploy-staging.sh
```

The exact syntax is not important. The structure is.

- `validate` gives quick signal.
- `build` proves the artifact can be created.
- `release` only runs on the branch that matters.

Most teams do not need a cleverer starting point than this.

## Common Pipeline Mistakes

### Doing everything in CI

If every tiny check depends on a remote runner, your team waits on the network for feedback that should have happened
locally.

CI should confirm things, not replace basic discipline on the developer machine.

### Treating pipeline length as maturity

More steps do not automatically mean better engineering. Many pipelines are bloated because each past incident added a
new check, but nothing was ever removed.

Pipelines need refactoring too.

### Rebuilding the same thing over and over

One of the most common wastes in CI is rebuilding dependencies, recompiling the same target in multiple jobs, or
creating slightly different artifacts in each environment.

Build once when possible. Promote the same artifact forward.

### Hiding deployment logic in ad hoc scripts

Some teams have a tidy CI workflow that eventually shells out into a mysterious deploy script nobody understands.

That is still pipeline complexity. You did not remove it; you just moved it.

### Accepting flaky tests as normal

This is the silent killer.

A flaky test does not just waste runner time. It corrupts the meaning of a passing build. Once people start thinking
"just rerun it", your pipeline is no longer providing signal.

## Build Pipelines and Organizational Design

Pipelines are not only technical systems. They mirror how a team works.

If releases require manual heroics, the pipeline will show it. If nobody owns test stability, the pipeline will show it.
If the architecture forces every change to touch everything else, the pipeline will show that too.

That is why pipeline pain is often an architectural smell:

- slow builds may point to poor boundaries
- huge test matrices may point to excessive coupling
- frequent merge breakage may point to weak trunk discipline
- manual release steps may point to missing operational maturity

In other words, a bad pipeline is often an honest measurement of a deeper problem.

## What to Optimize First

If your current pipeline is painful, I would optimize in this order:

1. Remove flakiness.
2. Cut feedback time for pull requests.
3. Make the build reproducible.
4. Reuse artifacts instead of rebuilding.
5. Separate PR checks from release checks.
6. Improve failure messages and observability.

That order matters because a fast pipeline you cannot trust is still bad, and a trustworthy pipeline that takes forever
will still be bypassed.

## Closing Thought

The best build pipelines are rarely impressive.

They are quiet, predictable, and boring. They give fast feedback, they fail for real reasons, and they let a team move
without gambling on whether the release will explode.

That is the goal.

Not pipeline cleverness. Confidence.
