# Instructions for agents working with CPU models

Read `SPEC.md` and both normative Markdown documents under `CPU/PROCESS` before creating, interpreting, validating, or changing a CPU model.

## Terminology

- The development model is **Context-Pulse-UI (CPU)**.
- `UI` is the top-level artifact and the root of `ui.yaml`.
- `View` remains the term for one user-relevant surface inside UI.
- Do not rename inner Views to UIs, pages, screens, routes, or components.

## Source hierarchy

- Treat Markdown specifications as authoritative methodology.
- Treat `context.yaml`, `pulse.yaml`, `ui.yaml`, and `requirements.yaml` as authoritative for a concrete system.
- Treat D2, SVG, PNG, and HTML as generated output. Never infer missing semantics from generated layout.
- Do not edit generated artifacts to change meaning; change the semantic YAML or normative Markdown and regenerate.

## Modeling discipline

- Preserve the boundaries between Context, Pulse, and UI.
- Do not infer Pulse flows from data use.
- Do not encode UI layout, controls, gestures, styling, or implementation architecture in `ui.yaml`.
- Model Context flow names as domain information, not protocol operations.
- Keep requirement wording exact and ordered. Do not summarize or redistribute attached requirements.
- Reject unknown fields, duplicate keys, unresolved references, invalid target addresses, and ambiguous IDs.
- Do not introduce generic abstractions, global registries, or cross-artifact relations unless the normative model explicitly adds them.

## Change workflow

1. Identify whether the requested change affects methodology or a concrete system model.
2. For methodology changes, update the authoritative Markdown first.
3. For model changes, update semantic YAML first.
4. Run `npm test`.
5. Run `npm run render -- --source <model-directory> --out <output-directory>` after model changes.
6. Inspect generated diagrams and review interactions before approval.
7. Report remaining uses of potentially ambiguous terminology and why each is intentional.

Do not add Python scripts or Python dependencies. Keep the reusable methodology and tooling in this repository rather than recreating them in each consuming project.
