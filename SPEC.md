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

`cpu-model/devmodel` is the normative source of truth for the general CPU methodology, including the specification, artifact formats, visual language, workflow, and tools. CPU projects normally use the current default-branch version of `cpu-model/devmodel`; they do not carry a pinned copy of the methodology. A project repository is the source of truth for its own concrete semantic model, project-specific instructions, and durable project artifacts.

The concrete five-file model is kept under the project's `CPU/` directory. General methodology changes are made only in `cpu-model/devmodel` and become applicable to projects when the current devmodel is read. Projects must not create divergent rewrites or copies of the general methodology in project-local documents.

For local agent work, sibling clones are the normal workspace arrangement: for example `devmodel/`, `evc/`, and `nibe/` under one parent directory. A project may expose the sibling methodology clone through an ignored `devmodel -> ../devmodel` symbolic link. The project's root `AGENTS.md` may use that stable local path as its bootstrap to `./devmodel/AGENTS.md`. ChatGPT project instructions instead identify `cpu-model/devmodel` and the working project repository on GitHub. If a historical methodology version is exceptionally required, that selection is managed outside the project repositories.

Project-specific instructions and decisions remain in the project repository. They may extend CPU only when clearly separated from the normative v1 model and must not silently change the meaning of existing fields or notation.

## Collaborative review workflow

The normal CPU process is a conversation between the user and the agent:

1. discuss the desired change and resolve questions;
2. create or update the semantic model files;
3. validate the complete model;
4. render Context, Pulse, UI, and Deployment into the concrete project's standard durable review location, `CPU/review/`; these generated review artifacts are committed with the accepted model change so the exact reviewed diagrams remain recoverable from repository history;
5. make the interactive review surface from those repository-backed artifacts available inside the current ChatGPT task or Work task;
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
