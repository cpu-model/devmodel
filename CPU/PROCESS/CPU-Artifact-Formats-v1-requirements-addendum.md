# Requirements and element links - normative v1 addendum

Date: 2026-09-18. Status: Normative supplement to Artifact Formats v1.

This addendum extends v1 with requirements attached to identified model elements. Existing Context, Pulse and UI schemas remain unchanged. If an earlier statement excludes normative cross-artifact references, the local requirement targets defined here are an explicit, limited exception. No generic cross-artifact relation mechanism is introduced.

## A1. Authoritative sources

`context.yaml`, `pulse.yaml` and `ui.yaml` are authoritative semantic model sources. The companion `requirements.yaml` is the authoritative source for requirements and their attachment to elements in those three artifacts. All four files belong to the same system model and are reviewed together.

Requirements must not be embedded in model names, generated D2 or SVG. The requirement badge, click behavior and layout are derived presentation defined by the companion Visual Language addendum.

## A2. Requirements format

The document has exactly one top-level field, `requirements`. Its value is a mapping from target address to an ordered, non-empty list of non-empty requirement strings. An empty mapping is valid when no requirements are defined. Duplicate mapping keys are invalid and must be detected before a parser overwrites them.

```yaml
requirements:
  context.flow.operating-data:
    - The system shall initiate retrieval of operating data.
  pulse.behavior.fetch-data:
    - One run shall comprise the complete retrieval.
  ui.action.diagnostics.acknowledge-error:
    - Acknowledgement shall be persistent.
```

Requirement list order is preserved. v1 adds no individual requirement IDs, metadata, status fields, presentation fields or verification fields. A string's wording does not serve as an ID. List positions are not stable identities.

## A3. Target addresses

Target addresses use the following forms. Words outside angle brackets are literal. IDs are taken from the corresponding semantic YAML; names and Pulse display numbers are never used as references.

- `context.system.<system-id>` targets the Context system.
- `context.party.<party-id>` targets a Context party.
- `context.flow.<flow-id>` targets a Context data flow.
- `pulse.behavior.<behavior-id>` targets a Behavior.
- `pulse.pulse.<pulse-id>` targets a Pulse.
- `ui.view.<view-id>` targets a View.
- `ui.action.<view-id>.<action-id>` targets an Action in that View.
- `ui.info.<view-id>.<information-id>` targets Information in that View.

Addresses are case-sensitive. For requirement addressing, an ID must not contain a period, which is the address separator. Validation must report an unaddressable ID rather than silently renaming it.

Pulse Flows, free-text triggers and View Navigation have no declared semantic IDs in v1 and are not directly addressable by this format. Relevant requirements must target an identified element, such as the triggering Pulse or affected View. This supplement does not introduce identities for those constructs.

## A4. Attachment semantics

Each mapping entry attaches its requirements directly to exactly the addressed element. There is no implicit inheritance from a View to its contents, from a Behavior to its emitted Pulses, or between artifacts. A renderer must not infer or redistribute attachments.

One requirement string may be explicitly repeated at several targets if that is intended. Such repetition does not imply shared requirement identity. An element without an entry has no directly attached requirements; this says nothing about whether other requirements affect its behavior.

## A5. Validation

- Reject unknown root fields, non-mapping requirement collections, invalid target syntax, duplicate keys, empty lists and non-string or blank requirement values.
- Resolve every target against the corresponding Context, Pulse or UI artifact of this system model. Reject unknown IDs and wrong element kinds. Action and Information IDs resolve only within their addressed View.
- Apply all existing model validation rules as well as the addressing restriction above. Never repair invalid references by matching display names.
- Reject orphaned targets after deleting or renaming an element. Update the model and its requirements together; do not silently discard requirements.
- Missing entries for otherwise valid elements are allowed. An empty `requirements` mapping is allowed.

## A6. Review and generation

The reviewed model comprises the three artifacts and the requirement attachment file. Diagram review must provide access to the exact requirement strings attached to the selected element. Approval of diagrams alone must not be assumed to approve requirements that were omitted from the review.

Generation reads all four sources. Model notation follows Visual Language v1. Requirement indicators are derived solely from resolved, non-empty attachments and follow its Requirements addendum. Generated files must not add, omit, summarize or reinterpret the authoritative requirement strings shown during review.
