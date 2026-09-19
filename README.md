# CPU development model

This repository contains the normative specifications for the Context-Pulse-UI (CPU) development model.

The semantic model consists of three artifact-specific YAML sources:

- `context.yaml` for system context and domain data flows
- `pulse.yaml` for causal event propagation
- `ui.yaml` for user-visible capability expressed as Views, Information, Actions, and meaningful Navigation

`UI` is the name of the top-level artifact. `View` remains the name of an individual user-relevant surface inside the UI artifact.

The normative documents are in [`CPU/PROCESS`](CPU/PROCESS). The Markdown files are the source for the requirements addenda attached to the PDF specifications.

## Validation

Run:

```sh
python3 tests/validate_naming.py
```

Rebuild the PDF addenda after editing their Markdown sources with:

```sh
python3 tools/update_process_pdfs.py
```
