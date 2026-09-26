# CPU development model

This repository contains the reusable methodology and tooling for the Context-Pulse-UI (CPU) development model.

## Start here

- [`SPEC.md`](SPEC.md) explains the model, source hierarchy, and project adoption rules.
- [`AGENTS.md`](AGENTS.md) tells Codex and other coding agents how to interpret and change CPU models.
- [`CPU Artifact Formats v1`](CPU/PROCESS/CPU-Artifact-Formats-v1.md) defines the semantic YAML formats and requirement attachments.
- [`CPU Visual Language v1`](CPU/PROCESS/CPU-Visual-Language-v1.md) defines diagram notation, rendering, and interactive requirement review.
- [`examples/model`](examples/model) is a minimal valid model.
- [`CPU - lathund för ett nytt projekt`](CPU-nytt-projekt-lathund.md) is a concise Swedish guide from an empty repository to incremental CPU development.

Markdown is the only documentation source. The repository includes a native PDF renderer for model review artifacts.

## Model sources

A concrete system model consists of:

- `context.yaml`
- `pulse.yaml`
- `ui.yaml`
- `deployment.yaml`
- `requirements.yaml`

`UI` is the top-level artifact. `View` remains the term for an individual user-relevant surface inside UI.

`deployment.yaml` is a complementary artifact for one concrete normative deployment. It records hosts, OS processes or Docker Compose projects, nested Compose services, implementation choices, environment declarations, ports, mounts, health checks, restart and resource instructions, and directed network connections. Server language defaults to Go; every Web UI platform and port is selected and recorded explicitly.

## Install

Requirements:

- Node.js 20 or later
- A PDF reader with support for Text annotations

```sh
npm install
```

The toolchain has no Python, D2, browser, or SVG dependency.

### Use CPU from a project repository

Clone `cpu-model/devmodel` beside the project repository and expose it through an ignored symbolic link named `devmodel`:

```sh
cd /path/to/workspace
git clone git@github.com:cpu-model/devmodel.git
git clone git@github.com:cpu-model/my-project.git
cd my-project
ln -s ../devmodel devmodel
```

The project keeps only its concrete five-file model under `CPU/`. It does not copy or pin the methodology. Its root `AGENTS.md` can bootstrap local agents with `./devmodel/AGENTS.md`. Add `/devmodel` to the project's `.gitignore` so the workspace link is not committed.

## Validate a model

```sh
npm run validate -- --source /path/to/model
```

Validation is strict: duplicate YAML keys, unknown fields, invalid identities, unresolved references, invalid requirement targets, and blank requirements are rejected.

## Render and review a model

```sh
npm run render -- \
  --source /path/to/model \
  --out /path/to/model
```

The renderer strictly validates all five YAML sources, computes artifact-specific layout, and writes only `context.pdf`, `pulse.pdf`, `ui.pdf`, and `deployment.pdf`. The diagrams are native PDF vector graphics. Elements with attached requirements carry blue speech-bubble Text annotations containing the exact complete ordered requirement text.

## Repository checks

```sh
npm test
```

This validates the normative terminology, strict model rules, native PDF structure, annotations, and the included example model.
