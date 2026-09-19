# Requirement indicators - normative v1 addendum

Date: 2026-09-18. Status: Normative supplement to Visual Language v1.

This addendum defines requirement indicators and interactive access to requirements. Context, Pulse and UI notation remains unchanged. The renderer baseline remains D2 0.9.0 with ELK. Requirement targets and source format follow the companion Artifact Formats Requirements addendum.

## R1. Purpose and meaning

A requirement indicator shows that requirements are directly attached to a model element. It is a review annotation and access control for those requirements, not a new semantic model element, data flow, Pulse or Action.

The indicator is a small outlined circle containing the lowercase letter `r`. The circle has a clear, opaque background. The letter is centered and readable. Meaning must remain clear in black and white; color is optional and secondary.

Show an indicator if and only if the element has a resolved, non-empty requirement attachment. Do not show indicators for elements without directly attached requirements. A container's indicator represents that container's own requirements, not the union of its contents' requirements.

## R2. Binding and repeated occurrences

Each indicator binds to exactly one target address from `requirements.yaml`. Activating it opens the requirements for that target. Never bind by label text or Pulse display number.

One indicator is shown per rendered occurrence of the addressed element. Where the same Pulse is drawn on several branches, each occurrence receives the indicator if that Pulse has attached requirements. All such indicators open the same attachment.

## R3. Placement

Placement must be deterministic and derived from actual rendered geometry. The indicator must appear close enough to its element that the attachment is unambiguous.

- Context flow: place it beside the data-flow label, clearly separated from both label and connector.
- System, party or Behavior: place it near the label or in a clear corner of the shape. Avoid text and connector attachment points.
- Pulse: place it beside the numbered Pulse symbol, outside that symbol and away from the connector path. Never put `r` inside the numbered circle.
- View: place it beside the View title. This represents requirements attached directly to the View.
- Action or Information: place it beside the item's label. Keep the existing Action and Information symbols visible.

An indicator must not overlap another indicator, any label, arrowhead, initiative symbol, numbered Pulse symbol or unrelated element. It must not obscure a connector or appear as part of that connector. Check clearance against the actual geometry of nearby elements. Use a consistent size and minimum clearance across diagrams; do not introduce manual per-diagram pixel fixes.

If sufficient space is unavailable, adjust deterministic generation or layout spacing. Do not weaken model notation or introduce an unstable second layout engine. Keep indicators inside the exported viewport without clipping.

## R4. Interactive behavior

In the interactive review view, clicking an `r` circle must display the complete requirements directly attached to its element. A side panel or equivalent review surface is acceptable. Display the element's name, stable target address and every requirement string in declared order, without paraphrasing or omission.

The active target must be clear. Selecting another indicator replaces the displayed requirement list with that target's requirements. An Action or Information indicator must open its own requirements rather than those of its containing View.

Indicators must also be keyboard-focusable, have a visible focus state and activate with Enter or Space. Provide an accessible name identifying the element and the purpose of opening its requirements. Hover may provide supplementary help but must not be the only access mechanism. Pointer hit areas may be larger than the visible circle if they do not interfere with nearby controls.

Clicking the model element itself may additionally open its requirements. This is optional and does not replace the visible `r` indicator.

## R5. Export and rendering

Generate indicators as minimal, deterministic SVG decoration after D2/ELK rendering. Do not add badge fields to semantic YAML or model the indicators as layout nodes. Target bindings derive from validated requirement attachments; positions derive from rendered element geometry.

Interactive behavior is guaranteed by the interactive review surface, which may embed SVG in HTML. A standalone SVG or static PNG need not offer click behavior. Static exports must retain visible indicators and provide a legend explaining that `r` denotes directly attached requirements. Static diagrams alone do not replace access to the requirements during review.

## R6. Acceptance

- Every rendered occurrence with directly attached requirements has one readable `r` indicator; occurrences without attachments have none.
- Indicators preserve all existing model semantics and notation, including Pulse-circle and initiative geometry.
- No indicators, labels or semantic symbols collide or become clipped at the normal review size.
- Every indicator opens exactly its target's complete, ordered requirements. Repeated Pulse occurrences open the same target; child View items retain their own targets.
- Pointer and keyboard activation work, and keyboard focus is visible.
- Given identical semantic sources, requirements, renderer version and layout settings, placement and bindings are reproducible.
