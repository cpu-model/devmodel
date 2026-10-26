# CPU Implementation Task Contract

- Status: Normative
- Scope: implementation-task authority and bounded execution

## 1. Purpose

The Normative Instruction Authority Gate prevents an implementation assignment from becoming an alternative product specification. Normative system behavior and presentation come only from the complete current CPU model. An implementation assignment may select work from that model and prescribe execution or verification boundaries, but it cannot create, change, clarify, strengthen, or weaken product semantics.

This procedure introduces the mandatory machine-checkable task contract. It is the only permitted instruction envelope for implementation work. The contract is an execution envelope, not a CPU artifact, requirement model, design document, or durable product specification. It must not copy requirement text.

## 2. Mandatory authority gate

Before implementation begins, the implementer must classify every instruction as exactly one of:

1. **Normative model authority** — behavior or presentation stated by the current five-file semantic base model or present optional Component and Presentation artifacts.
2. **Task scope or verification** — selection of existing requirement IDs, permitted or excluded source paths, or required verification kinds. These constrain the work but do not change product meaning.
3. **Technical implementation choice** — a reversible realization decision within freedom left by the model. It is not normative and must remain replaceable by another conforming choice.
4. **Candidate product decision** — behavior, presentation, acceptance meaning, or user-visible relationship not derivable from the current model, including a purported correction that changes such meaning.

A candidate product decision stops implementation before source changes begin. It must be proposed and reviewed as a model increment. The presence of valid requirement IDs elsewhere in the assignment does not authorize the candidate decision.

Historical implementations, prior chats, screenshots, mockups, review comments, and subjective quality observations may be diagnostic evidence. They are never normative product authority unless their relevant meaning has been incorporated into the current CPU model.

## 3. Machine-checkable contract

The contract is a standalone YAML document. An implementation task that is not this validated standalone document is invalid. Prose before, after, or inside it is rejected. Complementary conversation, review comments, attachments, and historical material are non-authoritative diagnostic context only; they cannot add or modify any instruction. If such material appears to direct the implementation, the authority gate stops the task.

```yaml
cpu-implementation-task:
  model-source: current
  scope:
    requirement-ids: [show-current-status]
  change-boundary:
    include: [internal/presentation/**]
    exclude: [CPU/**]
  verification: [project-tests, strict-cpu-validation, rendered-ui-review]
  diagnostic-references:
    - review/status.png
```

The root contains exactly `cpu-implementation-task`. Its mapping contains exactly:

- `model-source` — required and exactly `current`.
- `scope` — required; contains either `requirement-ids`, a non-empty duplicate-free list of IDs that resolve in the current `requirements.yaml`, or `complete-model: true`. These alternatives select existing authority and never import requirement text. `complete-model` preserves implementation work for valid models that have no attached requirements.
- `change-boundary` — required; contains exactly `include` and `exclude`. `include` is a non-empty duplicate-free list of repository-relative path patterns. `exclude` is a duplicate-free list that may be empty. Paths constrain implementation reach only.
- `verification` — required; a non-empty duplicate-free list using only `project-tests`, `strict-cpu-validation`, `architecture-checks`, `rendered-ui-review`, and `manual-review`.
- `diagnostic-references` — optional; a duplicate-free list of repository-relative paths. Every reference is diagnostic-only and confers no authority.

No free-text objective, acceptance criterion, behavior, presentation direction, correction description, design guidance, external normative source, or requirement copy is allowed. Unknown fields are invalid. A task needing additional product meaning must change the CPU model first rather than extend this contract.

## 4. Required use and stopping rule

Validate every implementation contract against the same current model that will govern implementation:

```text
npm run validate-task -- --task <task.yaml> --source <model-directory>
```

A missing, invalid, stale, or unresolved contract always stops implementation. A valid contract does not waive the semantic authority gate. If surrounding conversation, review feedback, or another source appears to add or modify an instruction, stop even though the contract passes.

## 5. What validation proves

The validator can establish that:

- the document uses the exact closed contract shape;
- no free-form requirement or design field exists in the contract;
- every selected requirement ID exists in the current model;
- path boundaries and diagnostic references are repository-relative and do not traverse outside the repository;
- verification values belong to the closed supported set.

The validator cannot establish that:

- natural-language instructions outside the contract contain no hidden product decision;
- the selected requirements are sufficient for the intended outcome;
- a technical choice is truly within the model's freedom;
- historical or visual evidence was interpreted correctly;
- implementation or rendered UI conforms semantically to the model.

Those limitations require semantic review by the implementer and human reviewer. Passing validation must never be reported as proof of requirement conformance.

## 6. Examples rejected by the gate

The following are candidate product decisions, not implementation scope:

- a new visual acceptance criterion such as a newly mandated legend, color, alignment, or layout;
- a new behavior described as a bug fix when the current model does not define the corrected behavior;
- a design direction justified only by a subjective review comment;
- a valid requirement ID combined with an extra acceptance rule absent from that requirement and the rest of the model;
- treating a previous chat, historical implementation, screenshot, or mockup as normative.

The following remain legitimate:

- choosing an internal algorithm, library, CSS technique, or component structure within model freedom;
- limiting edits to named implementation paths;
- requiring project tests, strict model validation, architecture checks, rendered UI review, or manual review;
- using historical code or images diagnostically while deriving acceptance solely from the current model.
