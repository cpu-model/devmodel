# Context-Pulse-UI development model

Status: Normative repository specification.

## Purpose

Context-Pulse-UI (CPU) is a small, artifact-specific development model for describing a system before and during incremental implementation. It separates three questions:

- **Context:** What system is being described, who communicates directly with it, what domain information crosses its boundary, and who can initiate those interactions?
- **Pulse:** What domain events can start or propagate causal behavior through the system?
- **UI:** What user-visible capabilities exist as Views, Information, Actions, and meaningful Navigation?

The three artifacts are complementary. None of them is an implementation architecture, runtime trace, screen design, protocol description, or generic metamodel.

`deployment.yaml` is a complementary implementation artifact. It records one concrete intended deployment of the CPU-described system without changing the meaning or name of Context-Pulse-UI.

## Normative sources

The normative responsibilities in `cpu-model/devmodel` are divided as follows:

1. `SPEC.md` defines the general CPU specification.
2. `AGENTS.md` defines the normative CPU workflow and agent/repository rules.
3. `CPU/PROCESS/CPU-Artifact-Formats-v1.md` defines the normative artifact formats.
4. `CPU/PROCESS/CPU-Visual-Language-v1.md` defines the normative visual language.

The repository does not maintain PDF counterparts. Markdown is the only documentation source.

For a concrete system model, the authoritative semantic sources are:

- `context.yaml`
- `pulse.yaml`
- `ui.yaml`
- `deployment.yaml`
- `requirements.yaml`

Generated D2, SVG, PNG, and HTML files are derived artifacts.

## Interpretation rules

- `UI` is the top-level artifact. A `View` is an individual user-relevant surface inside that artifact.
- Data direction in Context and initiative are independent semantics.
- Pulse represents possible causal event propagation, not data dependencies or exact execution traces.
- UI describes user capability and intent, not widgets, layout, gestures, responsive rules, or technical components.
- Deployment describes one concrete normative host/process topology, including explicitly selected implementation and runtime decisions.
- Requirement addresses attach strings directly to identified model elements. There is no implicit inheritance.
- IDs are stable machine-readable identity. Names are display text and may change independently.
- Unknown fields and unresolved references are errors. Tools must not silently repair or reinterpret invalid models.

## Project adoption

`cpu-model/devmodel` is the normative source of truth for the general CPU methodology, including the specification, artifact formats, visual language, workflow, tools, and installation/update mechanism. A project repository is the source of truth for its own concrete semantic model, project-specific instructions, and durable project artifacts.

The intended project installation is an installer-managed, pinned copy of a `cpu-model/devmodel` version under `CPU/`. That installed copy is not an independent general-methodology fork. General methodology changes are made in `cpu-model/devmodel` and then distributed to projects through the installation/update mechanism; projects must not create divergent rewrites of the general methodology in project-local documents.

Project-specific instructions and decisions remain in the project repository and must be kept separate from installer-managed methodology files where the installation mechanism requires it. They may extend CPU only when clearly separated from the normative v1 model and must not silently change the meaning of existing fields or notation.

## Collaborative review workflow

The normal CPU process is a conversation between the user and the agent:

1. discuss the desired change and resolve questions;
2. create or update the semantic model files;
3. validate the complete model;
4. render Context, Pulse, UI, and Deployment;
5. make the interactive review surface available inside the current ChatGPT task or Work task;
6. let the user inspect diagrams and activate `r` circles to read exact requirements;
7. iterate in the same task until the user approves the model.

The user must not be required to switch to an external editor, terminal, or browser application for normal review. Offline files remain available as a fallback.

## Tool contract

The repository provides a Node.js toolchain that:

1. parses and validates the five semantic YAML files;
2. generates deterministic D2;
3. invokes D2 0.9.0 with ELK;
4. embeds SVG and applies the normative CPU decoration in a self-contained review page;
5. provides interactive access to exact requirement attachments;
6. serves the review page on localhost so the agent can open it in the current ChatGPT task or Work task.

No Python runtime or Python packages are required.
