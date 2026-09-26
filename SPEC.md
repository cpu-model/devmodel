# Context-Pulse-UI development model

Status: Normative repository specification.

## Purpose

Context-Pulse-UI (CPU) is a small, artifact-specific development model for describing a system before and during incremental implementation. It separates three questions:

- **Context:** What system is being described, who communicates directly with it, what domain information crosses its boundary, and who can initiate those interactions?
- **Pulse:** What domain events can start or propagate causal behavior through the system?
- **UI:** What user-visible capabilities exist as Views, reusable SubViews, Information, Actions, and meaningful Navigation?

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

Generated diagrams are derived artifacts. The four repository-backed files `context.pdf`, `pulse.pdf`, `ui.pdf`, and `deployment.pdf` are the permanent review artifacts; the semantic YAML remains authoritative. The renderer generates these PDFs directly as vector graphics and does not require D2 or SVG intermediates.

## Interpretation rules

- `UI` is the top-level artifact. A `View` is an individual user-relevant surface inside that artifact. A `SubView` is a reusable user-visible fragment included by one or more Views.
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
4. render Context, Pulse, UI, and Deployment directly as native vector PDF;
5. generate `CPU/context.pdf`, `CPU/pulse.pdf`, `CPU/ui.pdf`, and `CPU/deployment.pdf`, each containing exactly one diagram with exact-requirement popup annotations;
6. present the repository-backed PDFs to the user in the current ChatGPT task or Work task;
7. let the user inspect diagrams and activate the blue popup-annotation markers in a reader that supports PDF Text annotations;
8. iterate in the same task until the user approves the model.

The user must not be required to switch to an external editor or terminal for normal review. Native PDF annotation behavior is verified in the readers used for review. Reader-specific popup chrome is not part of CPU notation.

## Tool contract

The repository provides a Node.js toolchain that:

1. parses and validates the five semantic YAML files;
2. computes deterministic artifact-specific layout;
3. draws the four diagrams directly as native PDF vector graphics;
4. adds one visible annotation marker and one PDF Text annotation for every rendered occurrence with directly attached requirements;
5. preserves the exact complete ordered requirement strings in each annotation;
6. publishes only the four permanent PDF review artifacts.

No Python runtime or Python packages are required.

If the active ChatGPT execution environment cannot execute the normative renderer locally, the methodology's GitHub Actions project-review workflow is the normative fallback. It runs the same devmodel tests, strict validation, and native PDF rendering against the project's five semantic files, writes the four diagram PDFs to `CPU/`, and commits changed generated review artifacts to the project repository. This automation produces review material; it does not itself constitute user review or acceptance.
