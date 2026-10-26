# Instructions for ChatGPT and Codex working with CPU models

Resolve the methodology root as the directory containing this file. Read its `SPEC.md` and all normative Markdown documents under its `PROCESS/` directory when embedded in a target project, or under its `CPU/PROCESS/` directory when working in the source `devmodel` repository. Do this before creating, interpreting, validating, or changing a CPU model.

## Replacement persistence gate

Before implementing persistence in a replacement system, follow the storage compatibility gate in `CPU/PROCESS/CPU-History-Migration.md`. Record the existing durable schema, information ownership, compatibility decisions and open issues in the project repository. Independent greenfield implementation does not waive this requirement. Do not approve persistence realization while compatibility remains unassessed. For every system with durable data, including new systems, complete the durable storage fitness review in the same methodology before accepting persistence realization.

## Substitutability prerequisite

Before undertaking Component Discovery, follow the mandatory Substitutability Discovery gate in `CPU/PROCESS/CPU-Component-Discovery.md` (or the corresponding embedded methodology path). Close the human-reviewed candidate decisions and contract normalization, and record approved substitution requirements in the semantic base model before identifying Component boundaries. No separate substitution YAML artifact is required.

## Terminology

- The development model is **Context-Pulse-UI (CPU)**.
- `UI` is the top-level artifact and the root of `ui.yaml`.
- `View` remains the term for one user-relevant surface inside UI.
- Do not rename inner Views to UIs, pages, screens, routes, or components.

## Source hierarchy

- Treat the current `cpu-model/devmodel` default branch as the normative source of truth for the general CPU methodology, including its specifications, workflow, validation, rendering, and review tools.
- Treat Markdown specifications in `cpu-model/devmodel` as authoritative methodology.
- Treat `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml` as the authoritative five-file semantic base model for a concrete system. Context, Pulse, and UI are the functional core, Deployment is the complementary implementation artifact, and Requirements contains normative attachments. Treat `components.yaml` as an optional complementary normative Component architecture artifact and `presentation.yaml` as an optional complementary normative Presentation artifact when they exist. Neither optional artifact changes the roles of the five base files. Each Component is a cohesive, necessary, bounded system part with one identifiable functional or infrastructural responsibility and the runtime implementation boundary that realizes it; there are no separate logical, runtime, or technical Component concepts.
- Treat PDF diagram geometry and any optional preview formats as generated output. Never infer missing semantics from generated layout.
- Do not edit generated artifacts to change meaning; change the semantic YAML or normative Markdown and regenerate.
- In a consuming project, `CPU/` contains the project's concrete five-file semantic base model and optional `components.yaml` and `presentation.yaml`. It does not contain a copied CPU methodology. General methodology is read from the current `cpu-model/devmodel` repository. In the normal local workspace, the project exposes that sibling clone through an ignored `devmodel -> ../devmodel` symbolic link so local agents can read `./devmodel/AGENTS.md`. ChatGPT may read the same repository directly from GitHub.

## Repository-backed incremental development

A CPU project repository is the source of truth for its concrete model, project-specific instructions, and durable project artifacts. CPU projects normally have one user and advance through a strict sequence of increments on the default branch. Each new increment starts from the latest accepted and pushed project state.

- Before implementation or normative model work from a local working copy, the acting agent may use `git pull` to synchronize it with the repository. Git is the transport for the current CPU model and project state; a clean but stale local copy is not sufficient. An agent working directly against the repository through repository tools must instead read the current repository state before changing it.
- If pull cannot be completed safely because of local changes or a conflict, stop and report the problem. Do not automatically stash, reset, create or switch branches, or perform other Git interventions.
- Before normative model work, read the current `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml` from the repository, plus `components.yaml` and `presentation.yaml` when present. Read the complete base model even when the requested change appears to affect only one artifact, so cross-artifact consequences are evaluated against one current baseline.
- Do not use conversational memory, previous chat summaries, generated diagrams, local copies, or Library artifacts as substitutes for current repository state.
- Read changed files back and verify their content before reporting success.

Repository/Git responsibility depends on the acting environment:

- When ChatGPT performs normative model or methodology work directly against the source-of-truth repository through repository tools, an accepted change should normally be written and committed directly to that repository. User acceptance of the change is sufficient authorization for that commit unless the user has requested a different workflow.
- When Codex works from a local repository clone, the normal workflow is:

  `pull → implement/model edit → build/test/validate/review → report → user commit → user push`

  Codex normally stops after verification and reporting. It performs commit, push, branch, pull-request, merge, or other Git-administration operations only when the user explicitly delegates the specific operation.
- Do not hand work from ChatGPT to Codex merely to persist or commit a normative change that ChatGPT can write directly through repository tools.

The default branch is the normal development line. Branches, pull requests, merges, and repository housekeeping are not part of the normal CPU workflow unless explicitly requested.

## History Migration prerequisite

Before an increment changes durable domain history representation, meaning, authority, or recoverability, apply the applicability gate in `CPU/PROCESS/CPU-History-Migration.md`. When affected history exists, complete the migration contract, execution safeguards, semantic verification, and cutover review before accepting migrated history as authoritative. Use existing Component reconciliation; do not assign domain authority to persistence merely because it executes a migration.

## Self-instructing implementation work

### Normative Instruction Authority Gate

Before changing implementation, classify every instruction by authority:

- **Normative model authority:** Product behavior and presentation come only from the complete current CPU model: the five-file semantic base model and any present `components.yaml` and `presentation.yaml`.
- **Task scope or verification:** An implementation task may narrow scope, name model requirement IDs, limit changed source paths, and prescribe verification work. Those instructions do not add to, reinterpret, strengthen, or weaken the model.
- **Technical implementation choice:** The implementer may make technical choices only within freedom left by the model. Such choices remain implementation decisions and must not be reported as newly normative product behavior or presentation.
- **Candidate product decision:** A new or changed product decision must first pass through a separate model increment and review. It is not authorized by an implementation task, a correct requirement-ID citation, a bug label, a review comment, historical code, a prior chat, or a screenshot.

If any implementation instruction appears to require product behavior or presentation that cannot be derived from the current model, stop before implementation. Report the candidate decision and its missing or conflicting model authority. Do not implement the unmodeled part, even when the same task also cites valid requirements or contains otherwise executable work.

Every implementation task must be supplied as the standalone machine-checkable contract defined by `CPU/PROCESS/CPU-Implementation-Task-Contract.md` and validated before implementation. This is the only permitted implementation-task instruction envelope. Complementary prose, chat messages, review comments, and attachments may provide diagnostic context but cannot add or modify scope, verification, technical direction, behavior, presentation, or acceptance. If they appear to do so, stop before implementation and request a corrected contract or a model increment. The contract is deliberately incapable of carrying requirement prose or design directions. A valid contract proves only its structure, current-model resolution, and declared execution boundary; it never proves semantic conformance of the requested or completed implementation.

CPU repositories carry the general working method so that task prompts can normally describe the desired outcome rather than repeat CPU procedure.

When asked to implement the current CPU model, or to make the project buildable or runnable according to the model:

- Treat the complete current five-file semantic base model, optional normative `components.yaml` and `presentation.yaml`, and project-specific repository instructions as the implementation contract.
- Inspect the existing implementation before changing it and implement only what is needed to satisfy the requested outcome and the current model.
- If `components.yaml` exists, validate and follow it. Do not redo Component Discovery, substitute different boundaries, or infer that a Component is a package, process, service, repository, database, container, or deployment unit. When the semantic base model changes, review whether Component responsibilities, assignments, information dispositions, or reconciliation prerequisites are affected; update components.yaml only when needed.
- If `presentation.yaml` exists, validate and follow it together with UI. Do not move functional content, grouping, occurrences, or order out of UI; do not infer unspecified presentation details. Presentation references must resolve against the validated UI model.
- For a Go implementation with approved `components.yaml`, perform Component Package Realization after semantic discovery according to section 10 of `CPU/PROCESS/CPU-Component-Discovery.md`. Derive packages from Components, normally keep exactly one primary Go package per Go-based Component and at most one Component per package, inventory dependencies with the Go toolchain, and enforce the reviewed mapping, allowed imports, and bounded exceptions with repository-owned executable architecture checks. Do not store package or file mappings in `components.yaml`.
- If `components.yaml` is absent, CPU makes no normative Component-boundary claim. For significant new architecture or structural refactoring, perform semantic Component Discovery according to `CPU/PROCESS/CPU-Component-Discovery.md`, present the proposal and findings for human review, and do not silently turn implementation intuition into normative architecture.
- Initial functional Component Discovery must not use current packages, files, processes, deployment units, or implementation structure as its input. Infrastructure discovery also examines Deployment and normative realization requirements, but existing structure never proves a boundary by itself. Existing implementation may be inspected separately to understand an implementation task and may reveal a previously unidentified necessary infrastructure responsibility during realization reconciliation; such a candidate requires the full Necessity Test and explicit architecture review before approval. Compare every source artifact with the approved Component architecture through realization reconciliation; keep exactly one unambiguous Component ownership for Go source/tests, HTML, templates, JavaScript, CSS, SQL, and equivalent source artifacts without recording file lists in `components.yaml`.
- Treat Component Discovery as a model-quality diagnostic. If it exposes an overloaded or unclear Capability, a dispatcher-like Behavior, a hidden domain-significant transition, or another possible functional-modeling problem, evaluate that finding in Pulse terms before restructuring implementation. Component convenience alone never justifies changing the base model.
- Derive build, runtime, topology, configuration, ports, mounts, health checks, and other deployment behavior from `deployment.yaml`. Do not assume Docker, Compose, or any other deployment technology unless the concrete model selects or requires it.
- Do not change the semantic model merely to make an implementation convenient or to match existing code.
- For external integrations, distinguish the normative functional contract from implementation-level protocol details. Before declaring an integration blocked because endpoints, authentication flows, response schemas, or other vendor-specific details are absent from the CPU model, independently investigate available authoritative vendor documentation, supported interfaces, and other reliable technical evidence. Select an implementation compatible with the model's declared deployment constraints and functional requirements; do not require runtime-specific configuration values (such as a device IP address supplied through an environment variable) merely to develop the adapter. Previously working integrations may provide evidence about protocol behavior, but retired implementation code is not a normative specification or a reusable implementation baseline. Do not infer undocumented behavior as fact.
- If an external integration remains blocked after investigation, report the exact unresolved technical facts, sources examined, what was verified, and why implementation or verification cannot safely proceed. Keep independently implementable functionality progressing with contract-driven test doubles. A missing vendor protocol detail is not automatically a CPU-model gap; propose a normative model change only when the required functional or deployment contract is genuinely underspecified.
- If implementation requires information that the normative model and project instructions do not provide, do not guess. Stop or continue only with unblocked work as appropriate, and report any concrete normative model gap for user resolution.
- Build and test the implementation using the repository's declared mechanisms, then run the CPU tests and strict validation required by this workflow.
- For an implementation with a user interface, review the actually rendered UI at viewport sizes relevant to its intended use, using representative data and states. Verify that normative Information and Actions remain accessible and usable; that UI Composition and applicable Presentation rules are realized; and that unintended overflow, overlap, or clipping does not impair usability. Intentional local scrolling is valid when the affected content remains accessible. This review must include actual visual inspection, not only source-code checks or element-existence assertions. Model validation, functional tests, and generated CPU diagrams do not by themselves establish acceptance of a rendered UI. If rendered review cannot be performed, report that verification limitation and do not describe the UI as fully verified. This requirement does not prescribe browsers, frameworks, styling techniques, breakpoints, or viewport dimensions; unspecified visual details remain implementation choices.
- Realizations of charts, tables, and timelines must provide enough context for a user to interpret the modeled Information and its relevant relationships. Depending on the information purpose, this may include units and scales, time or categories, data-series identification, readable values, explanations of markings, or a clear relationship between presented Information and related user Actions. These are possible means, not universally required graphical elements: no particular axis, legend, marking, or control is mandatory unless required elsewhere. Rendered review must assess whether the information is actually interpretable, not merely whether a chart, table, timeline, or drawing surface exists.
- After implementation, compare the result back against the complete semantic base model, optional Component architecture, and optional Presentation rules. For Go implementations with approved Components, also report Component Package Realization status, architecture-check results, and bounded exceptions. Report any remaining model-to-implementation gaps.
- Follow the repository-backed incremental workflow above and stop after verification and reporting for user review. Git administration remains the user's responsibility unless explicitly delegated.

Therefore a normal task prompt does not need to restate synchronization, source hierarchy, model-reading, validation, reporting, or Git-administration rules already defined here. Project-specific prompts should primarily state what outcome the user wants.

## Modeling discipline

- Preserve the boundaries between Context, Pulse, and UI.
- Preserve the boundary between UI and Presentation: UI owns functional content, grouping, occurrences, and order; Presentation owns only explicitly declared relative visual structure, representations, time-zone notation, visual continuity, and visual-resource use. Never introduce functional content in `presentation.yaml`.
- Do not infer Pulse flows from data use.
- Do not encode visual layout, controls, gestures, styling, or implementation architecture in `ui.yaml`; UI Composition is limited to functional grouping, occurrences, and order.
- Model Context flow names as domain information, not protocol operations.
- Model a configuration value as Domain Information when it has domain-functional meaning and changing it can alter functional decisions, results, or domain behavior. Deployment may additionally describe how it is supplied; purely technical configuration remains in Deployment.
- Keep requirement wording exact and ordered. Do not summarize or redistribute attached requirements.
- Reject unknown fields, duplicate keys, unresolved references, invalid target addresses, and ambiguous IDs.
- Do not introduce generic abstractions, global registries, or cross-artifact relations unless the normative model explicitly adds them.
- Do not add `components.yaml` merely to document an existing implementation. It is created only from reviewed Component Discovery. When present, preserve its exhaustive Behavior and Domain Information assignments, and review the impact of semantic base-model changes on its architecture.
- Do not create separate logical, runtime, functional, or technical Component models, add source-artifact mappings to `components.yaml`, infer reconciliation prerequisites from ordinary information reads, or model `UNRECONCILED`, `RECONCILING`, or `RECONCILED` as Domain Information. An infrastructure Component may own its technical state and invariants but does not thereby acquire functional authority over Domain Information that it transports, stores, restores, or coordinates.
- Treat Deployment commands, environment declarations, ports, mounts, health checks, restart policies, and resource constraints as normative implementation instructions.
- Default a server implementation language to Go when none is stated. Select and record an explicit platform for every Web UI; there is no Web UI platform default.
- An implementing agent may choose an unspecified Web UI platform or port, but must write the choice into `deployment.yaml` and expose it for user review.
- Never place secret values in `deployment.yaml`; record only variable names and secret classification.

## Shared change workflow

1. Identify whether the requested change affects methodology or a concrete system model.
2. For methodology changes, update the authoritative Markdown first.
3. For model changes, update semantic YAML first.
4. From the methodology root containing `package.json`, run `npm test`.
5. Run strict validation of the complete five-file semantic base model and optional Component and Presentation artifacts, using `npm run validate -- --source <model-directory>` or the equivalent validation performed by rendering.
6. From that root, run the renderer against the complete model. Rendering publishes only `context.pdf`, `pulse.pdf`, `ui.pdf`, and `deployment.pdf` into the concrete project's `CPU/` directory. These four PDFs are the durable generated review artifacts and are committed with the accepted model change. The normative renderer draws native PDF vector content directly and creates no D2 or SVG intermediates.
7. Present the four repository-backed PDFs for review.
8. Verify that Context, Pulse, UI, and Deployment PDFs were generated and that their requirement popup annotations contain the exact complete ordered requirement text for every annotated model element.
9. Present the generated PDFs to the user and ask for review.
10. Apply requested changes, rerun the tests, validation, and rendering, reload the same review surface, and continue until the user approves the model.
11. Report remaining uses of potentially ambiguous terminology and why each is intentional.

When the current ChatGPT execution environment cannot run the normative renderer locally, use the devmodel-provided GitHub Actions project-review workflow rather than recreating or approximating the renderer. The project repository may carry the workflow file supplied by devmodel; it checks out the current devmodel, installs its declared Node dependencies, tests and strictly validates the base model and optional Component and Presentation artifacts, renders the four diagram PDFs into `CPU/`, and commits those changed review artifacts. The generated artifacts must still be presented to the user for review; successful automation is not user acceptance.

These steps apply after semantic model changes regardless of which approved actor or repository client wrote the YAML files. For concrete project models, the generated review artifacts are durable project artifacts and must remain versioned in the project repository so the exact reviewed diagrams can be recovered from repository history. Optional previews and diagnostic exports are temporary derived artifacts and are not retained in the project repository.

## Environment responsibilities

### ChatGPT Chat or Work

ChatGPT typically leads discussion with the user, model analysis and modeling, and the collaborative review loop. Ordinary ChatGPT Chat is a valid CPU working environment; Work is not required merely because the work concerns a CPU model. When the available tools support repository access, ChatGPT may read and edit normative repository files directly and must read the written files back before reporting success. Codex is not required merely to persist model or methodology changes, and ChatGPT is not limited to reviewing work previously performed by Codex. Work may be used when its additional execution environment is useful for the requested work. When ChatGPT works directly against the source-of-truth repository, a normative change accepted by the user should normally be written and committed directly there; separate explicit authorization for that commit is not required unless the user has requested a different workflow. The normal increment still ends with a report for user acceptance.

### Codex

Codex typically performs local technical execution: read the applicable instructions and project files, implement code or model changes, build, test, strictly validate, render, run the local review server, perform interactive review when relevant, troubleshoot, and report the result. Codex may edit semantic YAML when that work is delegated to it, but is not the exclusive owner of semantic model editing. When Codex is operating inside a ChatGPT task or Work task, it must start the review server and open the result in that task's integrated browser when review is required. In standalone or offline Codex use, produce the same self-contained review output and report its exact location, but do not claim that the user reviewed or approved it.

After completing and verifying the requested work, Codex normally stops. It does not normally create branches or commits, push, create pull requests, merge, delete branches, or perform repository housekeeping. Codex may perform a specific Git-administration operation only when the user explicitly requests that operation.

When Codex operates inside ChatGPT Chat or Work, both responsibility sections apply: the ChatGPT environment provides the conversation and available review surface, while work may be divided according to the available tools and explicit delegation.

The normal workflow is collaborative and uses the capabilities available in the current ChatGPT environment. Discussion and model editing may take place in ordinary ChatGPT Chat. When local execution and an integrated PDF viewer are available, validation, rendering, and interactive review should remain in the same environment. Opening the generated PDFs in a separate local reader and standalone Codex repository work are fallback workflows, not the default handoff.

## Increment and conversation continuity

A new increment must be startable from verified repository state without relying on previous chat history. Store the normative model and any durable work information needed beyond the current conversation in the project repository. A completed conversation should in principle be deletable without losing the project's normative state or information required to continue the work. This does not require saving all discussion or temporary working notes.

Do not add Python scripts or Python dependencies. Keep the reusable general CPU methodology and tooling normatively in `cpu-model/devmodel`. Consuming projects use the current methodology directly and must not copy, recreate, pin, or develop it as a project-specific fork. A specific historical methodology version, when exceptionally needed, is selected outside the project repository.
