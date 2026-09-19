# Instructions for ChatGPT and Codex working with CPU models

Resolve the methodology root as the directory containing this file. Read its `SPEC.md` and both normative Markdown documents under its `PROCESS/` directory when embedded in a target project, or under its `CPU/PROCESS/` directory when working in the source `devmodel` repository. Do this before creating, interpreting, validating, or changing a CPU model.

## Terminology

- The development model is **Context-Pulse-UI (CPU)**.
- `UI` is the top-level artifact and the root of `ui.yaml`.
- `View` remains the term for one user-relevant surface inside UI.
- Do not rename inner Views to UIs, pages, screens, routes, or components.

## Source hierarchy

- Treat Markdown specifications as authoritative methodology.
- Treat `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml` as authoritative for a concrete system.
- Treat D2, SVG, PNG, and HTML as generated output. Never infer missing semantics from generated layout.
- Do not edit generated artifacts to change meaning; change the semantic YAML or normative Markdown and regenerate.

## GitHub-backed model access

When ChatGPT has access to a CPU project's GitHub repository, the repository is the source of truth for the concrete model.

- Before normative model work, read the current `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml` from the repository. Read all five even when the requested change appears to affect only one artifact, so cross-artifact consequences are evaluated against one current baseline.
- Do not use conversational memory, previous chat summaries, generated diagrams, local copies, or Library artifacts as substitutes for current repository state.
- Make ChatGPT-originated model changes on a dedicated branch unless the user explicitly requests a direct default-branch change.
- When the GitHub connector's high-level file create/update operation is unavailable or blocked, use the verified Git object write sequence: create blob → create tree based on the current branch head → create commit with that head as parent → update the branch ref without force.
- After every write, read the changed files back from the updated branch and verify that their content is exactly the intended model state before reporting success.
- Never force-update a branch for normal CPU model work.
- Keep the default branch unchanged until the user explicitly approves the integration path, such as merging an reviewed pull request.

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
5. From that root, run `npm run render -- --source <model-directory> --out <output-directory>` after model changes.
6. From that root, start `npm run review -- --dir <output-directory>` and keep the local server running.
7. Open the printed localhost URL in the current ChatGPT task or Work task's integrated browser. Do this yourself; do not merely give the URL or ask the user to open another application.
8. Verify that Context, Pulse, UI, and Deployment are visible and that every `r` circle opens the exact attached requirements.
9. Tell the user that the interactive model is ready in the current task and ask for review. Keep the browser tab and server available while discussing feedback.
10. Apply requested changes, rerun validation and rendering, reload the same review surface, and continue until the user approves it.
11. Report remaining uses of potentially ambiguous terminology and why each is intentional.

## Environment responsibilities

### ChatGPT task or Work task

ChatGPT owns the collaborative review loop with the user. Discuss the requested change and resolve questions before treating the model as approved. After Codex has edited, validated, and rendered the model, make the interactive review page available in the current task's integrated browser. Keep that surface available while the user inspects the diagrams and their `r` circles. Feed requested corrections back into the shared workflow and do not declare the model approved until the user approves it.

### Codex

Codex owns repository execution: inspect the applicable instructions and specifications, edit the semantic model sources, run strict validation, render all four diagrams, verify their requirement interactions, and report failures precisely. When Codex is operating inside a ChatGPT task or Work task, it must also start the review server and open the result in that task's integrated browser. In standalone or offline Codex use, produce the same self-contained review output and report its exact location, but do not claim that the user reviewed or approved it.

When Codex operates inside a ChatGPT task or Work task, both responsibility sections apply: Codex performs the repository work and the ChatGPT task provides the conversation and review surface.

The normal workflow is collaborative and in-app: discussion, model edit, validation, rendering, and interactive review all happen in the same ChatGPT task or Work task. Offline opening of `index.html` and standalone Codex repository work are fallback workflows, not the default handoff.

Do not add Python scripts or Python dependencies. Keep the reusable methodology and tooling in this repository rather than recreating them in each consuming project.
