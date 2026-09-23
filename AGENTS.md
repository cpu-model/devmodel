# Instructions for ChatGPT and Codex working with CPU models

Resolve the methodology root as the directory containing this file. Read its `SPEC.md` and both normative Markdown documents under its `PROCESS/` directory when embedded in a target project, or under its `CPU/PROCESS/` directory when working in the source `devmodel` repository. Do this before creating, interpreting, validating, or changing a CPU model.

## Terminology

- The development model is **Context-Pulse-UI (CPU)**.
- `UI` is the top-level artifact and the root of `ui.yaml`.
- `View` remains the term for one user-relevant surface inside UI.
- Do not rename inner Views to UIs, pages, screens, routes, or components.

## Source hierarchy

- Treat the current `cpu-model/devmodel` default branch as the normative source of truth for the general CPU methodology, including its specifications, workflow, validation, rendering, and review tools.
- Treat Markdown specifications in `cpu-model/devmodel` as authoritative methodology.
- Treat `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml` as authoritative for a concrete system.
- Treat D2, SVG, PNG, and HTML as generated output. Never infer missing semantics from generated layout.
- Do not edit generated artifacts to change meaning; change the semantic YAML or normative Markdown and regenerate.
- In a consuming project, `CPU/` contains the project's concrete five-file semantic model. It does not contain a copied CPU methodology. General methodology is read from the current `cpu-model/devmodel` repository. In the normal local workspace, the project exposes that sibling clone through an ignored `devmodel -> ../devmodel` symbolic link so local agents can read `./devmodel/AGENTS.md`. ChatGPT may read the same repository directly from GitHub.

## Repository-backed incremental development

A CPU project repository is the source of truth for its concrete model, project-specific instructions, and durable project artifacts. CPU projects normally have one user and advance through a strict sequence of increments on the default branch. Each new increment starts from the latest accepted and pushed project state.

- Before implementation or normative model work from a local working copy, the acting agent may use `git pull` to synchronize it with the repository. Git is the transport for the current CPU model and project state; a clean but stale local copy is not sufficient. An agent working directly against the repository through repository tools must instead read the current repository state before changing it.
- If pull cannot be completed safely because of local changes or a conflict, stop and report the problem. Do not automatically stash, reset, create or switch branches, or perform other Git interventions.
- Before normative model work, read the current `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml` from the repository. Read all five even when the requested change appears to affect only one artifact, so cross-artifact consequences are evaluated against one current baseline.
- Do not use conversational memory, previous chat summaries, generated diagrams, local copies, or Library artifacts as substitutes for current repository state.
- Read changed files back and verify their content before reporting success.

Repository/Git responsibility depends on the acting environment:

- When ChatGPT performs normative model or methodology work directly against the source-of-truth repository through repository tools, an accepted change should normally be written and committed directly to that repository. User acceptance of the change is sufficient authorization for that commit unless the user has requested a different workflow.
- When Codex works from a local repository clone, the normal workflow is:

  `pull → implement/model edit → build/test/validate/review → report → user commit → user push`

  Codex normally stops after verification and reporting. It performs commit, push, branch, pull-request, merge, or other Git-administration operations only when the user explicitly delegates the specific operation.
- Do not hand work from ChatGPT to Codex merely to persist or commit a normative change that ChatGPT can write directly through repository tools.

The default branch is the normal development line. Branches, pull requests, merges, and repository housekeeping are not part of the normal CPU workflow unless explicitly requested.

## Self-instructing implementation work

CPU repositories carry the general working method so that task prompts can normally describe the desired outcome rather than repeat CPU procedure.

When asked to implement the current CPU model, or to make the project buildable or runnable according to the model:

- Treat the complete current five-file semantic model and project-specific repository instructions as the implementation contract.
- Inspect the existing implementation before changing it and implement only what is needed to satisfy the requested outcome and the current model.
- Derive build, runtime, topology, configuration, ports, mounts, health checks, and other deployment behavior from `deployment.yaml`. Do not assume Docker, Compose, or any other deployment technology unless the concrete model selects or requires it.
- Do not change the semantic model merely to make an implementation convenient or to match existing code.
- If implementation requires information that the normative model and project instructions do not provide, do not guess. Stop or continue only with unblocked work as appropriate, and report the concrete model gap for user resolution.
- Build and test the implementation using the repository's declared mechanisms, then run the CPU tests and strict validation required by this workflow.
- After implementation, compare the result back against all five semantic artifacts and report any remaining model-to-implementation gaps.
- Follow the repository-backed incremental workflow above and stop after verification and reporting for user review. Git administration remains the user's responsibility unless explicitly delegated.

Therefore a normal task prompt does not need to restate synchronization, source hierarchy, model-reading, validation, reporting, or Git-administration rules already defined here. Project-specific prompts should primarily state what outcome the user wants.

## Modeling discipline

- Preserve the boundaries between Context, Pulse, and UI.
- Do not infer Pulse flows from data use.
- Do not encode UI layout, controls, gestures, styling, or implementation architecture in `ui.yaml`.
- Model Context flow names as domain information, not protocol operations.
- Keep requirement wording exact and ordered. Do not summarize or redistribute attached requirements.
- Reject unknown fields, duplicate keys, unresolved references, invalid target addresses, and ambiguous IDs.
- Do not introduce generic abstractions, global registries, or cross-artifact relations unless the normative model explicitly adds them.
- Treat Deployment commands, environment declarations, ports, mounts, health checks, restart policies, and resource constraints as normative implementation instructions.
- Default a server implementation language to Go when none is stated. Select and record an explicit platform for every Web UI; there is no Web UI platform default.
- An implementing agent may choose an unspecified Web UI platform or port, but must write the choice into `deployment.yaml` and expose it for user review.
- Never place secret values in `deployment.yaml`; record only variable names and secret classification.

## Shared change workflow

1. Identify whether the requested change affects methodology or a concrete system model.
2. For methodology changes, update the authoritative Markdown first.
3. For model changes, update semantic YAML first.
4. From the methodology root containing `package.json`, run `npm test`.
5. Run strict validation of the complete five-file model, using `npm run validate -- --source <model-directory>` or the equivalent validation performed by rendering.
6. From that root, run the renderer against the complete model. Rendering uses a temporary working directory and publishes only `context.pdf`, `pulse.pdf`, `ui.pdf`, and `deployment.pdf` into the concrete project's `CPU/` directory. These four PDFs are the durable generated review artifacts and are committed with the accepted model change. D2, raw SVG, finished SVG, HTML, JSON, and other intermediate renderer files are temporary and must not be committed to the project repository.\n7. Present the four repository-backed PDFs for review.
8. Verify that Context, Pulse, UI, and Deployment PDFs were generated and that their requirement popup annotations contain the exact complete ordered requirement text for every annotated model element.\n9. Present the generated PDFs to the user and ask for review.
10. Apply requested changes, rerun the tests, validation, and rendering, reload the same review surface, and continue until the user approves the model.
11. Report remaining uses of potentially ambiguous terminology and why each is intentional.

When the current ChatGPT execution environment cannot run the normative renderer locally, use the devmodel-provided GitHub Actions project-review workflow rather than recreating or approximating the renderer. The project repository may carry the workflow file supplied by devmodel; it checks out the current devmodel, installs its declared Node dependencies and D2 0.9.0, tests and strictly validates the model, renders the four diagram PDFs into `CPU/`, and commits those changed review artifacts/. The generated artifacts must still be presented to the user for review; successful automation is not user acceptance.

These steps apply after semantic model changes regardless of which approved actor or repository client wrote the YAML files. For concrete project models, the generated review artifacts are durable project artifacts and must remain versioned in the project repository so the exact reviewed diagrams can be recovered from repository history. Intermediate D2, SVG, PNG, HTML, JSON, and similar renderer files are temporary derived artifacts and are not retained in the project repository.

## Environment responsibilities

### ChatGPT Chat or Work

ChatGPT typically leads discussion with the user, model analysis and modeling, and the collaborative review loop. Ordinary ChatGPT Chat is a valid CPU working environment; Work is not required merely because the work concerns a CPU model. When the available tools support repository access, ChatGPT may read and edit normative repository files directly and must read the written files back before reporting success. Codex is not required merely to persist model or methodology changes, and ChatGPT is not limited to reviewing work previously performed by Codex. Work may be used when its additional execution environment is useful for the requested work. When ChatGPT works directly against the source-of-truth repository, a normative change accepted by the user should normally be written and committed directly there; separate explicit authorization for that commit is not required unless the user has requested a different workflow. The normal increment still ends with a report for user acceptance.

### Codex

Codex typically performs local technical execution: read the applicable instructions and project files, implement code or model changes, build, test, strictly validate, render, run the local review server, perform interactive review when relevant, troubleshoot, and report the result. Codex may edit semantic YAML when that work is delegated to it, but is not the exclusive owner of semantic model editing. When Codex is operating inside a ChatGPT task or Work task, it must start the review server and open the result in that task's integrated browser when review is required. In standalone or offline Codex use, produce the same self-contained review output and report its exact location, but do not claim that the user reviewed or approved it.

After completing and verifying the requested work, Codex normally stops. It does not normally create branches or commits, push, create pull requests, merge, delete branches, or perform repository housekeeping. Codex may perform a specific Git-administration operation only when the user explicitly requests that operation.

When Codex operates inside ChatGPT Chat or Work, both responsibility sections apply: the ChatGPT environment provides the conversation and available review surface, while work may be divided according to the available tools and explicit delegation.

The normal workflow is collaborative and uses the capabilities available in the current ChatGPT environment. Discussion and model editing may take place in ordinary ChatGPT Chat. When local execution and an integrated browser are available, validation, rendering, and interactive review should remain in the same environment. Offline opening of `index.html` and standalone Codex repository work are fallback workflows, not the default handoff.

## Increment and conversation continuity

A new increment must be startable from verified repository state without relying on previous chat history. Store the normative model and any durable work information needed beyond the current conversation in the project repository. A completed conversation should in principle be deletable without losing the project's normative state or information required to continue the work. This does not require saving all discussion or temporary working notes.

Do not add Python scripts or Python dependencies. Keep the reusable general CPU methodology and tooling normatively in `cpu-model/devmodel`. Consuming projects use the current methodology directly and must not copy, recreate, pin, or develop it as a project-specific fork. A specific historical methodology version, when exceptionally needed, is selected outside the project repository.
