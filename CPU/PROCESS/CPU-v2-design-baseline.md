# CPU v2 frozen design baseline

Status: Accepted design baseline for the next CPU methodology generation. This document is not yet normative methodology. Until the v2 implementation increment is complete, `SPEC.md`, `AGENTS.md`, `CPU-Artifact-Formats-v1.md`, and `CPU-Visual-Language-v1.md` remain normative.

## Purpose

CPU v2 extends Pulse with domain-significant informational participation while preserving CPU as a small artifact-specific model. It also introduces optional functional review partitioning and stable requirement identity.

The v2 implementation shall be a hard migration. There is no dual v1/v2 model syntax, compatibility aliasing, generic metamodel, global identity registry, or general cross-artifact relation mechanism.

## Pulse

Pulse answers:

> What does the system functionally do, what domain events can start or propagate causal behavior, and what domain-significant information participates in that behavior?

Pulse has two independent dimensions around Behavior:

- causal event propagation through Pulses and Flows;
- Domain Information participation through `information-in` and `information-out`.

Information participation never implies Pulse causality. Pulse causality never implies Domain Information participation.

Behavior remains the functional meeting point. Pulse does not describe exact execution traces, implementation data dependencies, function signatures, storage structures, message payloads, or implementation architecture.

## Capability

Capability is an optional flat functional partition of Pulse Behaviors used only when local causal review materially improves comprehension of the Pulse model.

When Capabilities are present:

- every Behavior belongs to exactly one declared Capability;
- a Capability contains only `id` and `name`;
- Capability membership introduces no ownership, causality, information flow, implementation boundary, or requirement inheritance;
- Capabilities are not requirement-addressable;
- Domain Information, Pulses, and Flows are not owned by Capabilities.

Introduce Capabilities only when the partition has:

1. functional cohesion;
2. meaningful causal locality;
3. materially reduced review complexity.

Do not derive Capabilities from packages, modules, services, processes, deployment units, protocols, persistence, external parties, features, use cases, increments, requirement categories, diagram size, or renderer convenience. Capability size and balance are not validity criteria. Capabilities are not hierarchical.

Repartitioning Behaviors should normally leave Behavior, Pulse, Flow, Domain Information, and requirement semantics unchanged.

## Domain Information

Domain Information identifies domain-significant information whose participation is necessary to understand the functional meaning of one or more Behaviors.

A Domain Information element initially contains only `id` and `name`.

A Behavior may reference Domain Information through:

- `information-in`: information that participates as functional input to the Behavior;
- `information-out`: information whose resulting domain content the Behavior can establish.

The same Domain Information may be both input and output of the same Behavior.

Domain Information has no Capability ownership. The same semantic information may participate in Behaviors in multiple Capabilities.

Model Domain Information only when all of the following hold:

1. it has domain identity independent of technical representation;
2. its participation is functionally significant to understanding Behavior;
3. it is not merely a Behavior-local intermediate;
4. its meaning remains stable across reasonable changes of implementation, storage, transport, or algorithm.

Finally, explicit information participation must add useful understanding beyond Behavior, Pulse, and requirements.

Do not create Domain Information merely because something is stored, transmitted, parsed, cached, displayed, calculated, passed as a parameter, represented by a field, or used internally. A technical representation change does not create new Domain Information. Domain Information identity follows domain meaning, not serialization, storage, transport, or processing representation.

Domain Information does not introduce schemas, fields, cardinality, types, persistence ownership, sources, destinations, or information-to-information relations.

Every declared Domain Information element must be referenced by at least one Behavior through `information-in` or `information-out`. It need not have both a producer and a consumer.

## Structure and requirements

CPU structural notation expresses positive semantics. Semantics for which CPU provides explicit structural notation shall be expressed structurally. Requirements qualify that structure with normative rules and shall not duplicate structural semantics merely for traceability.

Absence of a structural relation does not by itself constitute an explicit normative prohibition. Negative or qualified constraints are expressed through requirements where they matter to system behavior.

Attach a requirement to the smallest addressable semantic element whose own meaning or behavior the rule constrains.

Domain Information is requirement-addressable as:

`pulse.domain-information.<id>`

Domain Information requirements define domain meaning or invariants that remain meaningful independently of a particular producer or consumer. Rules about establishment, use, transformation, timing, conditions, or decisions belong to the relevant Behavior.

Capability is not requirement-addressable.

## Requirement identity

Every requirement is an object with exactly:

- `id`;
- `text`.

String-only requirement entries are not valid in v2.

Requirement IDs are human-readable semantic keys and are unique within the concrete system's `requirements.yaml`. They are not UUIDs, sequence numbers, or target-address encodings.

A requirement ID remains stable across editorial rewording and relocation to a better semantic target when normative meaning is unchanged. A normative meaning change creates a new requirement identity. Deleted requirements are deleted; history remains in Git.

A requirement shall express one independently assessable normative rule. If one part can reasonably change without requiring another part to be reconsidered, the parts should normally be separate requirements. This does not imply one requirement per sentence, field, test assertion, or code branch.

## Pulse artifact shape

The v2 Pulse additions are intentionally small:

```yaml
pulse:
  capabilities:
    - id: charging-planning
      name: Charging planning

  domain-information:
    - id: latest-valid-soc
      name: Latest valid SoC

  behaviors:
    - id: plan-charging
      name: Plan charging
      capability: charging-planning
      information-in:
        - latest-valid-soc
      information-out:
        - operational-plan

  pulses: []
  flows: []
```

`capabilities` and `domain-information` are optional.

If `capabilities` is absent, Behaviors have no `capability` field. If it is present, every Behavior has exactly one valid `capability` reference.

`information-in` and `information-out` are optional lists of references to declared Domain Information.

No generic information-flow graph is introduced.

## Visual language

Pulse uses one integrated Behavior notation with orthogonal semantic attachment sides:

- incoming Pulse terminates on the Behavior's left side;
- outgoing Pulse starts on the Behavior's right side;
- `information-in` terminates on the Behavior's top side;
- `information-out` starts on the Behavior's bottom side.

The primary causal progression is laid out left to right, but Pulse connectors may route backward or around the graph for cycles or other non-forward causal relations. Attachment side, not the global geometric direction of every connector segment, carries the normative distinction.

Domain Information is rendered as a square-corner rectangle. Direction and Behavior attachment side express information participation; no additional information symbol or connector label is required.

A Behavior has exactly one graphical occurrence in a Capability detail diagram. Domain Information may have multiple graphical occurrences when needed to preserve orthogonal reading and reduce crossings. Repeated occurrences represent the same semantic identity and requirements.

Pulse routing should preferentially preserve the vertical information zones immediately above and below Behaviors.

## Pulse review projections

Without Capabilities, `pulse.pdf` contains one integrated system Pulse diagram using Pulse, Behavior, and Domain Information notation.

With Capabilities, `pulse.pdf` is a deterministic multi-page review document containing:

1. a Pulse Capability overview;
2. one integrated Capability detail diagram per Capability in declaration order.

The overview contains:

- Capability nodes;
- cross-Capability Pulse Flow occurrences;
- external-trigger Pulses entering Capability boundaries;
- a local Pulse legend.

It contains no Domain Information, internal Capability flows, invented Capability dependencies, or full external Trigger text.

External trigger Flows are projected in the overview as incoming Pulses from outside the Capability topology. This does not create a new semantic source type. Full Trigger text appears in the receiving Capability detail.

Flow coverage is deterministic:

- trigger source: overview and receiving Capability detail;
- same-Capability source and destination: that Capability detail only;
- different source and destination Capabilities: overview, source Capability detail, and destination Capability detail.

Cross-Capability detail projections use graphical boundary references such as `FROM <Capability>` and `TO <Capability>`. These are presentation context, not semantic model elements and not requirement targets.

Different Pulses between the same Capabilities remain distinct. A real fan-out of the same Pulse retains the same Pulse identity on every branch. Internal flows do not become overview self-loops.

Each review diagram contains a legend only for Pulse identities rendered in that diagram, ordered by global Pulse declaration order. Pulse display identity remains globally stable and is never renumbered per diagram.

The durable generated review artifacts remain exactly:

- `context.pdf`;
- `pulse.pdf`;
- `ui.pdf`;
- `deployment.pdf`.

A review PDF may contain multiple deterministic diagrams/pages when required by its notation; v2 therefore replaces v1's rule that every PDF contains exactly one diagram.

## Requirement annotations

Requirement popup annotations remain presentation of direct requirement attachment, not semantic elements.

Every rendered occurrence of a requirement-addressable semantic element with requirements receives an annotation for the same target. Repeated Domain Information occurrences therefore receive equivalent annotations. Capability and graphical `FROM`/`TO` boundary references receive none.

Behavior requirement-marker placement must preserve clearance from top Domain Information connectors, lateral Pulse connectors, Behavior text, and other markers. Exact deterministic geometry is a renderer concern.

## Renderer priorities

Renderer work shall preserve, in order:

1. semantic attachment sides;
2. clear primary Pulse causal reading;
3. clear Domain Information input/output reading;
4. node, symbol, text, and annotation clearance;
5. reduced connector crossings;
6. reuse of a Domain Information occurrence when natural;
7. otherwise repetition of the Domain Information occurrence.

No numeric crossing threshold or model mutation is introduced to accommodate rendering.

## Explicit non-goals

CPU v2 does not introduce:

- a generic metamodel;
- a global identity registry;
- general cross-artifact references;
- a separate State element;
- an information-flow graph;
- information-to-information relations;
- Capability hierarchy;
- Capability requirements;
- Capability-level information dependencies;
- data schemas;
- a verification map;
- implementation mappings;
- guards or conditions on Pulse Flows;
- branch or gateway notation;
- explicit Capability dependencies;
- Domain Information ownership;
- backward-compatible dual requirement syntax.

Context, UI, and Deployment do not gain automatic semantic relations to Pulse Domain Information or Capabilities.

## Agent and implementation boundary

Agents must not infer Pulse Flows from Domain Information use, or Domain Information participation from Pulse Flows.

Agents derive Capability and Domain Information from ordinary domain discussion where semantics are clear. They shall not introduce mandatory user questions merely to populate these structures. Ask only when alternative models correspond to materially different system behavior or domain meaning.

Capability membership does not prescribe packages, modules, classes, services, processes, repositories, or deployment.

Domain Information participation does not prescribe function parameters, Go types, database schemas, persistence ownership, API payloads, caches, or messages.

An implementing agent retains freedom over those realization choices unless constrained elsewhere by the CPU model or project instructions. When materially different interpretations would change domain behavior, the agent reports a model gap rather than guessing.

## Implementation sequencing

The v2 methodology shall be implemented as one coherent methodology generation from the perspective of consuming projects. Do not leave the default branch in a half-migrated state that makes current v1 projects invalid before validator, renderer, tests, and normative documentation are v2-complete.

Internally, implementation should proceed in this order:

1. normative v2 methodology;
2. strict requirement identity format;
3. Pulse semantic model and validation;
4. deterministic review projections;
5. Pulse layout and PDF rendering;
6. v2 acceptance and stress tests.

Do not migrate consuming projects such as EVC while devmodel v2 is incomplete.

Once v2 is complete, it becomes the sole current normative methodology. Git history preserves v1; no long-lived parallel compatibility mode is required.
