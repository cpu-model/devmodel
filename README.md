# CPU development model

This repository contains the reusable methodology and tooling for the Context-Pulse-UI (CPU) development model.

## Start here

- [`SPEC.md`](SPEC.md) explains the model, source hierarchy, and project adoption rules.
- [`AGENTS.md`](AGENTS.md) tells Codex and other coding agents how to interpret and change CPU models.
- [`CPU Artifact Formats v1`](CPU/PROCESS/CPU-Artifact-Formats-v1.md) defines the semantic YAML formats and requirement attachments.
- [`CPU Visual Language v1`](CPU/PROCESS/CPU-Visual-Language-v1.md) defines diagram notation, rendering, and interactive requirement review.
- [`examples/model`](examples/model) is a minimal valid model.

Markdown is the only documentation source. The repository contains no PDF documents or PDF build chain.

## Model sources

A concrete system model consists of:

- `context.yaml`
- `pulse.yaml`
- `ui.yaml`
- `requirements.yaml`

`UI` is the top-level artifact. `View` remains the term for an individual user-relevant surface inside UI.

## Install

Requirements:

- Node.js 20 or later
- D2 0.9.0 with ELK support
- A modern browser to open the generated interactive review page

```sh
npm install
```

The toolchain has no Python dependencies.

If D2 is not on `PATH`, set `D2_BIN` or pass `--d2`.

## Validate a model

```sh
npm run validate -- --source /path/to/model
```

Validation is strict: duplicate YAML keys, unknown fields, invalid identities, unresolved references, invalid requirement targets, and blank requirements are rejected.

## Render and review a model

```sh
npm run render -- \
  --source /path/to/model \
  --out /path/to/output \
  --review-title "Increment 3"
```

The output contains deterministic D2, SVG, `model.json`, and a self-contained `index.html`. Open `index.html` to display all three decorated diagrams and inspect the exact requirements attached to each marked element.

## Repository checks

```sh
npm test
```

This validates the normative terminology and the included example model without requiring D2 or Chrome.
