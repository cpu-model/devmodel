# CPU Component Discovery

Status: Normative methodology.

## 1. Purpose and status

CPU's concrete semantic base model remains `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml`, with the meanings defined by the CPU specification and Artifact Formats v2. Context, Pulse, and UI are the functional core, Deployment is the complementary implementation artifact, and Requirements contains normative attachments. Component Discovery derives logical implementation boundaries from that semantic model without changing it.

`components.yaml` is an optional complementary logical architecture artifact. If it is absent, CPU makes no normative statement about logical Component boundaries. If it is present, its Component boundaries, Behavior assignments, and Domain Information authority or disposition assignments are normative. An implementation agent must follow that reviewed model and must not replace it with a new discovery result. Changing a boundary requires an explicit model change and human review.

A **Component is a normative logical implementation boundary that has exclusive authority for a cohesive responsibility whose ownership or isolation must be preserved. It owns the decisions, state transitions, persistent supporting lifecycle, or invariants assigned to that responsibility. It does not imply a package, directory, process, service, repository, database, container, or deployment unit.** Deployment continues to describe physical realization.

Component Discovery is a semantic design and review activity. It must not begin from files, packages, processes, deployment units, or an existing implementation. Existing implementation may be considered only after the initial semantic proposal exists, as a separate reconciliation against the proposed or approved Component architecture; it must not retroactively become discovery evidence.

## 2. Interpretation principles

- Authority granularity is not Component granularity. One Component may own several compatible authorities, and separate state or separate authority does not by itself require separate Components.
- A Capability is cohesion evidence, not a Component boundary. Several Capabilities may belong to one Component, and one Capability may require several Components.
- A Pulse crossing identifies a possible interaction, not ownership.
- `information-out` makes a Behavior an authority candidate for the emitted information; it does not prove that the Behavior's eventual Component owns the information.
- Reading information does not confer authority.
- An external adapter does not own internal domain state merely because it delivers an observation.
- A persistence mechanism does not own state merely because it stores it.
- Adapters, projections, calculations, presentation, infrastructure, and utilities are not automatically Components.

Authority means the logical implementation authority permitted to accept or establish the relevant state transitions and responsible for protecting their invariants.

## 3. Discovery procedure

Perform Component Discovery in this order:

1. Read and strictly validate the complete current five-file CPU semantic base model.
2. Create a Behavior–Information inventory recording each Behavior's Domain Information inputs and outputs and the requirements that bear directly on the analysis.
3. Classify every Domain Information item semantically as mutable internal information, external input or fact, immutable transfer or result, or derived information. Record uncertainty rather than guessing.
4. Identify candidate authorities: who may establish, accept, reject, or change each relevant item or decision. Do not equate producer, reader, adapter, or storage mechanism with owner.
5. Inventory invariants, acceptance transitions, and persistent lifecycles. Trace each to the Behaviors, Domain Information, and requirement IDs that support it; do not copy or rewrite requirement text.
6. Form small authority seeds around transitions and invariants that must initially remain together.
7. Identify explicit producer/acceptor and other contracts between seeds, including whether a recipient independently accepts, rejects, activates, supersedes, suspends, or ends a producer's result.
8. After authority analysis, use Capability membership as additional cohesion evidence.
9. Identify adapters, projections, calculations, presentation, infrastructure, and utilities separately so technical or derived work is not mistaken for domain authority.
10. Apply the merge/split test in section 4 to the seeds.
11. Apply the Component Necessity Test in section 5 to every resulting candidate.
12. Absorb candidates that do not need a separate normative boundary into a passing Component where semantically appropriate, or classify implementation-only elements outside the Component model.
13. Verify that every Pulse Behavior has exactly one proposed Component and every Domain Information item has exactly one authority or non-authoritative disposition.
14. Record unresolved boundaries and functional-model findings explicitly. Do not conceal them through an architectural choice.
15. Submit the proposal and its evidence to human review. Codex or another analysis agent is not the final architecture authority.
16. Condense only the approved result into `components.yaml`.

The semantic authority matrix, invariant inventory, candidate decision log, merge/split analysis, and unresolved alternatives are discovery work and review material. They are not additional normative CPU artifacts. Requirements remain the source of truth for functional rules and invariants.

The four Domain Information outcomes are mutually exclusive in the approved architecture:

- **mutable internal authority** maps to `authority`; the named Component owns acceptance of its transitions and protection of its invariants;
- **external input or fact** maps to `external-input` only while its relevant truth is established outside the system; an internally accepted, normalized, or mutable representation with its own transitions instead needs an authority;
- **immutable transfer or result** maps to `transfer` when it crosses a responsibility contract without a continuing mutable lifecycle; later acceptance may create separate authoritative state;
- **derived information** maps to `derived` when it is reproducible from other information and has no independently authoritative transitions. It may be materialized or cached, but persistent derived information with independent update, validity, or consistency invariants needs an authority instead.

If the model does not establish which case applies, record UNRESOLVED and do not create `components.yaml` until human review resolves the disposition.

## 4. Merge/split test

For each pair or group of candidates, answer all of the following:

- Do they exercise the same authority?
- Must their transitions be atomic to protect the same invariant?
- Is there an explicit producer/acceptor contract between them?
- Can the recipient independently accept, reject, activate, supersede, suspend, or end the result?
- Does safety or consistency require an exclusive authority boundary?
- Do they have independently identifiable lifecycles?

The following are normative decisions:

- Candidates whose transitions must be atomic under one invariant must be merged unless the base model explicitly defines a consistency protocol that preserves the invariant across the boundary.
- Authorities that must be exclusive for safety or consistency must not be duplicated across Components.
- A producer and a recipient with an explicit result contract and an independently authoritative acceptance lifecycle must remain separable; merging requires an explicit reason that preserves both authorities.
- Independently identified lifecycles must not be silently collapsed when doing so obscures their acceptance or termination authority.

Reasons to change, timing, external dependencies, failure and retry patterns, persistence, and observed coupling or cohesion are heuristics. They can strengthen or weaken a proposal but cannot override the normative authority and invariant rules.

The following never justify a merge by themselves: the same subject word, the same Capability, the same external system, the same database, the same process, the same UI View, or many reads of the same information.

If mandatory merge and split conclusions conflict, record an unresolved boundary or functional-model finding. Do not resolve the conflict by hidden design intuition.

## 5. Component Necessity Test

Run this test after merge/split analysis and before proposing the normative model.

### Phase A — authority foundation

A candidate must have at least one semantically evidenced foundation:

- authority over mutable Domain Information;
- authority over an invariant that spans transitions or time;
- an independently modeled domain or supporting lifecycle;
- exclusive safety or consistency authority; or
- persistent supporting state whose ownership must be unambiguous.

If no foundation exists, the candidate is **FAIL**.

### Phase B — boundary necessity

An authority foundation is necessary but not sufficient. A separate normative boundary also requires at least one of these reasons:

- merging would make authority or invariant ownership ambiguous;
- the candidate independently accepts, rejects, activates, supersedes, suspends, or ends another responsibility's result;
- safety or consistency requires an exclusive boundary;
- a normative failure, ordering, or non-interference rule requires isolation;
- a persistent supporting lifecycle spans otherwise independent authorities and needs one owner; or
- an independently identified lifecycle must remain visible and protected.

The result is one of:

- **PASS** — the candidate requires a normative Component boundary;
- **FAIL** — it remains an internal responsibility or module, calculation, projection, adapter, presentation concern, infrastructure, or utility; or
- **UNRESOLVED** — the CPU base model lacks enough semantics to decide. This is a model finding for human review.

FAIL does not remove the responsibility. A separate algorithm, View, package, cadence, external source, persistence mechanism, or reason to change is never sufficient by itself. Conversely, small implementation size does not demote real state or invariant authority to a utility.

When a failing candidate contains a modeled Pulse Behavior, that Behavior must be absorbed into exactly one passing Component before `components.yaml` can be created. Only responsibilities without modeled Behaviors can remain wholly outside the Component list. If no candidate passes the test, omit `components.yaml`; do not invent a Component merely to satisfy coverage.

## 6. Review and realization

The proposal must show the intended Components, assigned Behaviors, authoritative Domain Information, non-authoritative Domain Information dispositions, failed candidates and their placement, and unresolved findings. Review evaluates semantic correctness, cohesion, necessity, and consistency with Deployment. Structural validation cannot perform that judgment.

After approval, `components.yaml` is the sole normative condensation of the Component architecture. Discovery working material may be retained as ordinary project review material when useful, but it has no CPU artifact status. Implementation then realizes the approved logical boundaries within the physical constraints in Deployment. Package or runtime choices remain implementation decisions unless another normative artifact constrains them.
