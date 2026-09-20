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

## GitHub-backed model access

When ChatGPT has access to a CPU project's GitHub repository, that project repository is the source of truth for its concrete model, project-specific instructions, and durable project artifacts.

- Before normative model work, fetch or otherwise query the remote and verify the current default-branch head. Base the work on that verified state; a clean but stale local clone is not sufficient.
- Before normative model work, read the current `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml` from the repository. Read all five even when the requested change appears to affect only one artifact, so cross-artifact consequences are evaluated against one current baseline.
- Do not use conversational memory, previous chat summaries, generated diagrams, local copies, or Library artifacts as substitutes for current repository state.
- Make normative changes on a dedicated branch from the verified current default branch, regardless of whether ChatGPT, Codex, or another approved repository client performs the write. Change the default branch directly only when the user explicitly requests it.
- When the GitHub connector's high-level file create/update operation is unavailable or blocked, use the verified Git object write sequence: create blob → create tree based on the current branch head → create commit with that head as parent → update the branch ref without force.
- After every write, read the changed files back from the updated branch and verify that their content is exactly the intended model state before reporting success.
- Never force-update a branch for normal CPU model work.
- Keep the default branch unchanged before merge. Normally create a pull request from the work branch to the default branch after validation and review.
- Passing tests is not merge approval, and approval of the model review is not automatically merge approval. Merge only after the user explicitly approves the merge.
- After merge, verify the new remote default-branch head and synchronize the working base before starting further work.

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

ChatGPT typically leads discussion with the user, model analysis and modeling, and the collaborative review loop. When its tools support the operation, ChatGPT may perform GitHub-native repository work directly: create a branch, edit semantic YAML, read written files back, and create a pull request. Codex is not required merely to persist semantic YAML, and ChatGPT is not limited to reviewing work previously performed by Codex. ChatGPT must not merge until the user explicitly approves the merge.

### Codex

Codex typically performs local repository execution: local inspection, implementation, tests, strict validation, rendering, the local review server, interactive review, and other local tool execution. Codex may also edit semantic YAML when that work is explicitly delegated to it. Codex is not the exclusive owner of semantic model editing or repository changes. When Codex is operating inside a ChatGPT task or Work task, it must start the review server and open the result in that task's integrated browser when review is required. In standalone or offline Codex use, produce the same self-contained review output and report its exact location, but do not claim that the user reviewed or approved it.

When Codex operates inside a ChatGPT task or Work task, both responsibility sections apply: the task provides the conversation and review surface, while work may be divided between GitHub-native operations and local execution according to the available tools and explicit delegation.

The normal workflow is collaborative and in-app: discussion, model edit, validation, rendering, and interactive review all happen in the same ChatGPT task or Work task. Offline opening of `index.html` and standalone Codex repository work are fallback workflows, not the default handoff.

## Increment and conversation continuity

A new increment must be startable from verified repository state without relying on previous chat history. Store the normative model and any durable work information needed beyond the current conversation in the project repository. A completed conversation should in principle be deletable without losing the project's normative state or information required to continue the work. This does not require saving all discussion or temporary working notes.

Do not add Python scripts or Python dependencies. Keep the reusable general CPU methodology and tooling normatively in `cpu-model/devmodel`; consuming projects receive them through an installer-managed, pinned `CPU/` copy and must not recreate or develop them as a project-specific fork.
