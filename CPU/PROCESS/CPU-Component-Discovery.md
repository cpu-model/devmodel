# CPU Component Discovery

Status: Normative methodology.

## 1. Purpose and status

CPU's concrete semantic base model remains `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml`. `components.yaml` is an optional complementary normative Component architecture artifact derived from that complete base model without changing it.

If `components.yaml` is absent, CPU makes no normative Component-boundary claim. If present, its Component boundaries, Behavior assignments, Domain Information authority or disposition assignments, and reconciliation prerequisites are normative. Changing them requires an explicit model change and human review.

A **Component is a normative runtime implementation boundary with a cohesive functional responsibility derived from the CPU semantic model. A Component realizes that responsibility at runtime and may own authoritative state and transitions, derive information, perform observations or integrations, realize presentation behavior, protect safety or failure isolation, reconcile runtime state, or otherwise provide functionality required by the model.**

There is one Component concept, not separate logical and runtime Components. Semantic responsibility determines the Component; runtime artifacts realize that same Component. A Component does not automatically correspond to a package, directory, process, service, repository, database, container, or deployment unit. Deployment continues to describe concrete physical realization.

Component Discovery is semantic-first. It must not begin from files, packages, processes, deployment units, or an existing implementation. Existing implementation is examined only after a semantic proposal has been reviewed, through realization reconciliation in section 9; it never retroactively becomes discovery evidence.

## 2. Interpretation principles

- Authority is strong Component-boundary evidence, not a prerequisite for every Component.
- Authority granularity is not Component granularity. One Component may own several compatible authorities; separate state or authority does not automatically require separate Components.
- A Capability is cohesion evidence, not a Component boundary. Several Capabilities may belong to one Component and one Capability may require several Components.
- A Pulse crossing identifies possible causal interaction, not ownership or reconciliation dependency.
- `information-out` makes a Behavior an authority candidate for emitted information; it does not establish eventual Component authority.
- Reading information does not confer authority and does not imply a reconciliation prerequisite.
- An external adapter does not own internal domain state merely because it delivers an observation. Persistence does not own state merely because it stores it.
- Observation, integration, calculation, estimation, projection, presentation, safety/failure isolation, and reconciliation responsibilities may be legitimate Components when the semantic base model supplies a cohesive functional foundation and the Necessity Test requires a separate runtime boundary. The category alone never creates a Component.

Authority means the runtime implementation authority permitted to accept or establish relevant mutable state transitions and responsible for protecting their invariants.

## 3. Functional configuration

A configuration value with domain-functional meaning whose change can alter functional decisions, results, or domain behavior is Domain Information. Deployment may additionally describe how the implementation receives that value. For example, `fallback-charging-rate` is Domain Information even when Deployment supplies it through `CHARGING_RATE_SOC_PER_HOUR`.

Purely technical configuration remains in Deployment, including HTTP ports, SQLite paths, mounts, and container restart policies. Delivery mechanism does not determine semantic classification.

## 4. Discovery procedure

Perform Component Discovery in this order:

1. Read and strictly validate the complete current semantic base model.
2. Create a Behavior–Information inventory with relevant requirement IDs.
3. Classify every Domain Information item as mutable internal authority, external input or fact, immutable transfer or result, or derived information. Record uncertainty rather than guessing.
4. Identify cohesive functional responsibilities evidenced by Behaviors and Requirements, including authority, invariants/lifecycles, observation/integration, calculation/estimation/projection, presentation, safety/failure isolation, and reconciliation responsibility.
5. Identify candidate authorities and inventory invariants, acceptance transitions, persistent lifecycles, supporting state, and failure/ordering/non-interference rules. Trace all findings to semantic evidence.
6. Form small responsibility seeds around functions that initially need to remain coherent. Do not form seeds from implementation structure.
7. Identify producer/acceptor and other explicit contracts between seeds.
8. Use Capability membership as additional cohesion evidence, never as an automatic boundary.
9. Apply the merge/split test in section 5.
10. Apply the Component Necessity Test in section 6 to every candidate.
11. Absorb failed candidates into a passing Component where semantically appropriate. An implementation element that is not itself a Component candidate still realizes exactly one passing Component; it does not receive a separate Component entry.
12. Verify that every Pulse Behavior has exactly one proposed Component and every Domain Information item has exactly one authority or non-authoritative disposition.
13. Define reconciliation prerequisites only where validity establishment truly requires another Component to be RECONCILED. Do not derive them from ordinary information reads.
14. Record unresolved boundaries and functional-model findings explicitly.
15. Submit the proposal and evidence to human review. An analysis agent is not the final architecture authority.
16. Condense only the approved result into `components.yaml`.

The inventories, decision logs, merge/split analysis, and alternatives are discovery work, not additional normative CPU artifacts.

Domain Information outcomes are mutually exclusive:

- **mutable internal authority** maps to `authority`;
- **external input or fact** maps to `external-input` while relevant truth remains externally established;
- **immutable transfer or result** maps to `transfer` when it has no continuing mutable lifecycle;
- **derived information** maps to `derived` when reproducible from other information and without independently authoritative transitions.

`derived` classifies information authority status. It does not place the deriving function outside Component architecture. For example, `charging-rate-estimate` may be `derived` while a Charging Estimation Component realizes the normative estimator function. Persistent derived information with independent update, validity, finalization, invalidation, consistency, or reconciliation rules must instead be analyzed as authority.

## 5. Merge/split test

For each pair or group of candidates ask:

- Do they realize one cohesive functional responsibility?
- Do they exercise the same authority?
- Must transitions be atomic to protect one invariant?
- Is there an explicit producer/acceptor contract?
- Can a recipient independently accept, reject, activate, supersede, suspend, or end the result?
- Does safety, consistency, failure isolation, ordering, or non-interference require a boundary?
- Do they have independently identifiable lifecycles or reconciliation responsibilities?
- Would merging or splitting obscure a runtime responsibility required by the model?

Transitions that must be atomic under one invariant are merged unless the base model defines a consistency protocol across the boundary. Exclusive safety or consistency authority is not duplicated. An explicit result contract with independent acceptance remains separable unless a documented merge preserves both responsibilities. Independently identified lifecycles and required failure isolation are not silently collapsed.

Timing, external dependencies, retry patterns, persistence, and observed implementation coupling are heuristics only. The same subject, Capability, external system, database, process, View, or frequent information read never justifies a merge or split by itself. Conflicting mandatory conclusions produce UNRESOLVED, not hidden design intuition.

## 6. Component Necessity Test

Run this after merge/split analysis and before proposing the normative architecture.

### Phase A — functional foundation

A candidate must have semantic evidence for an independently identifiable runtime responsibility. Evidence may include:

- authority over mutable Domain Information;
- an invariant spanning transitions or time;
- an independent lifecycle;
- safety or consistency authority;
- persistent supporting state;
- modeled observation or external integration;
- modeled calculation, estimation, or projection;
- modeled presentation responsibility;
- normative failure, ordering, or non-interference responsibility;
- reconciliation responsibility; or
- another function directly evidenced by Behaviors or Requirements.

Without a modeled functional foundation the candidate is **FAIL**. Component architecture never introduces functionality absent from the semantic base model and requirements.

### Phase B — boundary necessity

A functional foundation is necessary but insufficient. The responsibility must genuinely require a separate cohesive runtime Component boundary. Evidence includes ambiguous authority or invariant ownership if merged, independent acceptance or lifecycle, required safety/consistency/failure isolation, normative ordering or non-interference, independent reconciliation responsibility, or another model-backed reason that the runtime responsibility must remain separately identifiable.

The result is:

- **PASS** — a normative Component boundary is required;
- **FAIL** — the responsibility is realized within another Component or remains implementation-only; or
- **UNRESOLVED** — the base model lacks enough semantics and human review is required.

A file, package, View, algorithm, cadence, external source, database, container, deployment unit, or reason to change is never sufficient alone. Small implementation size does not demote a real responsibility. Every modeled Behavior must be assigned to exactly one passing Component before `components.yaml` can be created. A behaviorless Component still needs explicit structural grounding under Artifact Formats v2.

## 7. Component reconciliation

Component reconciliation is the general runtime architecture mechanism for startup, relevant reconfiguration, migration, and recovery. It establishes or re-establishes valid Component runtime state and invariants after validity has been lost. It is distinct from Pulse, which expresses normal functional causality.

Every Component has one architecture-mechanical state:

- `UNRECONCILED` — valid runtime state and invariants cannot yet be assumed;
- `RECONCILING` — the Component is establishing them;
- `RECONCILED` — normal operation may rely on them.

These states are not Domain Information. At startup all Components are `UNRECONCILED`. A Component may begin reconciliation only after every Component in its `reconciliation.requires` list is `RECONCILED`. The Component itself determines how to establish correct runtime state and invariants using relevant persistent state, functional configuration, current or reusable valid observations, and valid prerequisites. Reconciliation may perform external effects, including fail-safe effects, when required to establish the invariant.

The system/runtime executes dependency ordering and must not permit normal operation to use a Component in a way that assumes reconciled state before it is `RECONCILED`. This graph execution is general runtime mechanics and does not create a Startup Manager or Reconciliation Manager domain Component.

A Component becomes `UNRECONCILED` when its established runtime state or invariants can no longer be assumed valid. Invalidation propagates transitively to every Component that directly or indirectly requires it. The affected acyclic graph then reconciles again in dependency order. Ordinary Domain Information change does not automatically invalidate a Component; normal functional change is handled through Pulse.

Startup, relevant reconfiguration, migration, and recovery use the same mechanism and differ only in which Components are invalidated. A reconciliation dependency is stronger than an ordinary information dependency. Reading information produced by another Component never automatically creates `requires`.

## 8. Convergence and decision closure

Component Discovery must terminate in a reviewable architecture rather than an open-ended cycle of candidate reconsideration.

1. **One complete inventory first.** Establish the complete Behavior and Domain Information inventory and collect relevant requirement evidence before proposing final boundaries. Missing coverage is a concrete defect, not a reason to reopen already resolved unrelated decisions.
2. **Explicit candidate verdicts.** Apply the merge/split test and both Necessity Test phases once per candidate or contested boundary. Record PASS, FAIL, or UNRESOLVED, with specific model evidence and the placement of every failed responsibility. An unsubstantiated preference is not an UNRESOLVED finding.
3. **Evidence-driven reopening only.** Reopen a closed verdict only for newly discovered normative evidence, a demonstrated contradiction, a changed base model, or a failed coverage/consistency check. State exactly what changed and which verdicts it affects. Repeated review with no such delta must not reset a decision.
4. **Localize conflicts.** Resolve a conflict at the smallest affected boundary or Domain Information item. Preserve all unaffected verdicts; do not restart the entire discovery.
5. **No speculative Components.** A possible future feature, implementation convenience, shared utility, or hypothetical failure mode cannot keep a boundary unresolved. If the model provides no necessity evidence for a separate Component, assign the function to a passing cohesive Component or record a specific functional-model gap.
6. **Close with mechanical checks.** Before review, check exhaustive and unique Behavior assignments, exhaustive and unique Domain Information dispositions, authority consistency, acyclic and justified reconciliation prerequisites, and every candidate's Necessity Test verdict. The review proposal must contain the resulting complete mapping, not only a component-name shortlist.
7. **Single consolidated human decision.** Present the completed proposal, evidence-backed alternatives that remain genuinely unresolved, and any required model corrections together. Human approval closes the reviewed architecture. After approval, produce the normative artifact; do not reopen approved boundaries without one of the concrete triggers in rule 3.
8. **No arbitrary numerical target.** Neither a preferred Component count nor a target number of iterations may override semantic correctness. Convergence comes from closing evidence-backed decisions, not suppressing genuine contradictions.

These are process rules, not additional semantic evidence or permission to guess. A real contradiction or insufficient normative definition remains UNRESOLVED until resolved through human review or a base-model correction.

## 9. Review and realization reconciliation

The proposal shows Components, assigned Behaviors, Domain Information outcomes, reconciliation prerequisites, failed candidates and placement, and unresolved findings. Review evaluates semantic correctness, cohesion, necessity, runtime boundary fitness, and consistency with Deployment.

After approval, `components.yaml` is the sole normative condensation of Component architecture. Implementation must realize those same runtime boundaries within Deployment constraints.

Realization reconciliation compares implementation with the approved architecture after semantic discovery. Every source artifact realizing the system has exactly one unambiguous Component ownership, including Go source and tests, HTML, templates, JavaScript, CSS, SQL, and equivalent source artifacts. HTML/templates/JavaScript/CSS are source code and are not outside Component architecture.

File-to-Component mapping is not stored in `components.yaml`; Codex and implementation work keep it unambiguous. A folder tree per Component is a natural strategy but not a CPU format requirement. A generic `shared` folder must not evade ownership. If one source artifact appears to realize several Components, split it when appropriate or report that the Component boundary may need review.

Current implementation may produce findings during realization reconciliation but never supplies retroactive evidence for initial discovery.
