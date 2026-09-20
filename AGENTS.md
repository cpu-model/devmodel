# Instructions for ChatGPT and Codex working with CPU models

Resolve the methodology root as the directory containing this file. Read its `SPEC.md` and both normative Markdown documents under its `PROCESS/` directory when embedded in a target project, or under its `CPU/PROCESS/` directory when working in the source `devmodel` repository. Do this before creating, interpreting, validating, or changing a CPU model.

## Terminology

- The development model is **Context-Pulse-UI (CPU)**.
- `UI` is the top-level artifact and the root of `ui.yaml`.
- `View` remains the term for one user-relevant surface inside UI.
- Do not rename inner Views to UIs, pages, screens, routes, or components.

## Source hierarchy

- Treat `cpu-model/devmodel` as the normative source of truth for the general CPU methodology, including its specifications, workflow, validation, rendering and review tools, and installation mechanism.
- Treat Markdown specifications in `cpu-model/devmodel` as authoritative methodology.
- Treat `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml` as authoritative for a concrete system.
- Treat D2, SVG, PNG, and HTML as generated output. Never infer missing semantics from generated layout.
- Do not edit generated artifacts to change meaning; change the semantic YAML or normative Markdown and regenerate.
- In a consuming project, treat `CPU/` as an installed, pinned copy of the methodology version obtained from `cpu-model/devmodel`, not as an independent general-methodology fork. Correct general methodology defects in `cpu-model/devmodel`, then distribute the correction through the installer/update mechanism. Keep project-specific instructions outside installer-managed methodology files.

## Repository-backed incremental development

A CPU project repository is the source of truth for its concrete model, project-specific instructions, and durable project artifacts. CPU projects normally have one user and advance through a strict sequence of increments on the default branch. Each new increment starts from the latest accepted and pushed project state.

- Before implementation or normative model work, Codex may use `git pull` to synchronize the local working copy with the repository. Git is the transport for the current CPU model and project state; a clean but stale local copy is not sufficient.
- If pull cannot be completed safely because of local changes or a conflict, stop and report the problem. Do not automatically stash, reset, create or switch branches, or perform other Git interventions.
- Before normative model work, read the current `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml` from the repository. Read all five even when the requested change appears to affect only one artifact, so cross-artifact consequences are evaluated against one current baseline.
- Do not use conversational memory, previous chat summaries, generated diagrams, local copies, or Library artifacts as substitutes for current repository state.
- Read changed files back and verify their content before reporting success.

The normal CPU increment workflow is:

`pull → implement/model edit → build/test/validate/review → report → user commit → user push`

The default branch is the normal development line. After the increment has been implemented, verified, reviewed when relevant, and accepted, the user normally performs `git commit` and `git push`. Branches, pull requests, merges, and repository housekeeping are not part of the normal CPU workflow. Codex may perform those Git operations only when the user explicitly requests the specific operation.

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

Therefore a normal Codex task prompt does not need to restate synchronization, source hierarchy, model-reading, validation, reporting, or Git-administration rules already defined here. Project-specific prompts should primarily state what outcome the user wants.

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
- Codex may choose an unspecified Web UI platform or port, but must write the choice into `deployment.yaml` and expose it for user review.
- Never place secret values in `deployment.yaml`; record only variable names and secret classification.

## Shared change workflow

1. Identify whether the requested change affects methodology or a concrete system model.
2. For methodology changes, update the authoritative Markdown first.
3. For model changes, update semantic YAML first.
4. From the methodology root containing `package.json`, run `npm test`.
5. Run strict validation of the complete five-file model, using `npm run validate -- --source <model-directory>` or the equivalent validation performed by rendering.
6. From that root, run `npm run render -- --source <model-directory> --out <output-directory>` after model changes.
7. From that root, start `npm run review -- --dir <output-directory>` and keep the local server running.
8. Open the printed localhost URL in the current ChatGPT task or Work task's integrated browser. Do this yourself; do not merely give the URL or ask the user to open another application.
9. Verify that Context, Pulse, UI, and Deployment are visible. Verify every `r` circle against its exact target address and complete ordered requirement text, including pointer activation and the keyboard activation required by the Visual Language.
10. Tell the user that the interactive model is ready in the current task and ask for review. Keep the browser tab and server available while discussing feedback.
11. Apply requested changes, rerun the tests, validation, and rendering, reload the same review surface, and continue until the user approves the model.
12. Report remaining uses of potentially ambiguous terminology and why each is intentional.

These steps apply after semantic model changes regardless of which approved actor or repository client wrote the YAML files. Generated D2, SVG, PNG, and HTML remain derived artifacts and never replace the semantic sources.

## Environment responsibilities

### ChatGPT task or Work task

ChatGPT typically leads discussion with the user, model analysis and modeling, and the collaborative review loop. When its tools support the operation, ChatGPT may edit semantic YAML and read the written files back. Codex is not required merely to persist semantic YAML, and ChatGPT is not limited to reviewing work previously performed by Codex. The normal increment still ends with a report for user acceptance; Git administration is performed only when the user explicitly requests it.

### Codex

Codex typically performs local technical execution: read the applicable instructions and project files, implement code or model changes, build, test, strictly validate, render, run the local review server, perform interactive review when relevant, troubleshoot, and report the result. Codex may edit semantic YAML when that work is delegated to it, but is not the exclusive owner of semantic model editing. When Codex is operating inside a ChatGPT task or Work task, it must start the review server and open the result in that task's integrated browser when review is required. In standalone or offline Codex use, produce the same self-contained review output and report its exact location, but do not claim that the user reviewed or approved it.

After completing and verifying the requested work, Codex normally stops. It does not normally create branches or commits, push, create pull requests, merge, delete branches, or perform repository housekeeping. Codex may perform a specific Git-administration operation only when the user explicitly requests that operation.

When Codex operates inside a ChatGPT task or Work task, both responsibility sections apply: the task provides the conversation and review surface, while work may be divided according to the available tools and explicit delegation.

The normal workflow is collaborative and in-app: discussion, model edit, validation, rendering, and interactive review all happen in the same ChatGPT task or Work task. Offline opening of `index.html` and standalone Codex repository work are fallback workflows, not the default handoff.

## Increment and conversation continuity

A new increment must be startable from verified repository state without relying on previous chat history. Store the normative model and any durable work information needed beyond the current conversation in the project repository. A completed conversation should in principle be deletable without losing the project's normative state or information required to continue the work. This does not require saving all discussion or temporary working notes.

Do not add Python scripts or Python dependencies. Keep the reusable general CPU methodology and tooling normatively in `cpu-model/devmodel`; consuming projects receive them through an installer-managed, pinned `CPU/` copy and must not recreate or develop them as a project-specific fork.
