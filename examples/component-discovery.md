# Component Discovery examples

Status: Non-normative examples of the normative method in `CPU/PROCESS/CPU-Component-Discovery.md`.

These examples are deliberately small. A real discovery must evaluate the complete base model and must not treat a pattern below as an automatic boundary rule.

## Substitutability Discovery before Component Discovery

The candidate inventory is performed against the complete five-file semantic base model **before** proposing Component IDs or boundaries. The following is an illustrative review, not a normative EVC decision:

| Candidate responsibility | Evidence | Recommendation | Human decision |
| --- | --- | --- | --- |
| Vehicle observation integration | External vehicle state and observation Behavior | Accept | Required before proceeding |
| Charger observation and control integration | External charger state, energy and control flows | Accept | Required before proceeding |
| Electricity price acquisition | External price data and acquisition Behavior | Accept | Required before proceeding |
| Planning algorithm | Planning Behavior alone does not establish a replacement need | Reject unless justified | Required before proceeding |
| Storage engine | Technical feasibility of another database alone is insufficient | Reject unless justified | Required before proceeding |

A human may add candidates. The table must be completed with explicit accept/reject decisions; a recommendation is not approval. A reviewed record of rejected candidates and reasons remains in the project repository, while approved normative constraints are attached to valid semantic addresses in `requirements.yaml`.

For an accepted charger integration, the **common contract** might require establishing an effective safe-off state, observing connection state, reporting whether a requested mode was actually established, and handling communication failures. A particular GARO implementation may use `ALWAYS_OFF` and `ALWAYS_ON`; those vendor commands are not automatically common-contract vocabulary. The current concrete Context and Deployment can still identify GARO.

The default requirement is source-level substitution: replace an implementation and rebuild without changing consuming responsibilities or their approved contract. This does not imply hot swapping, simultaneous providers, or fallback. The Necessity Test must respect the approved boundary evidence but must **not** create one normative Component per vendor, nor automatically one per approved contract.

### Gate acceptance examples

- **PASS:** All candidates explicitly decided, approved requirements attached to valid model targets, provider-specific assumptions distinguished from common contracts, and no unresolved contradictions. Component Discovery may begin.
- **PASS (empty):** All candidates explicitly rejected with rationale, reviewed closure recorded, and no substitution constraints added. Component Discovery may begin.
- **BLOCK:** One candidate remains undecided, an approved contract contradicts a vendor-specific normative requirement without resolution, or a candidate was assessed only from source-file structure. Component Discovery must not begin.
- **BLOCK:** Component Discovery proposes to merge a provider implementation with its consumer such that source-level substitution would require consumer modification. Report the boundary conflict rather than silently weakening the approved constraint.

## Capability and Component granularity

One Capability may contain a producer that issues an immutable authorization and an independent executor that accepts or rejects it and owns an execution lifecycle. The contract and separate acceptance authority make both candidates PASS the boundary phase and can justify two Components even though the Capability is one cohesion signal.

Conversely, one authority may preserve a single reservation invariant through Behaviors placed in the `Offer management` and `Capacity management` Capabilities. If accepting an offer and reserving capacity must be atomic, both Capabilities belong to one Component.

The same Component may also own several compatible authorities—for example, a work queue and its retry schedule—when they form one persistent lifecycle and separating their transitions would require atomic coordination. Separate authorities are not automatically separate Components; this candidate PASSES as one Component.

## Producer, transfer, and acceptor

A planner produces an immutable proposed plan. An execution authority independently accepts, rejects, activates, supersedes, suspends, and ends plans. The plan is disposed as `transfer`; the acceptor's active execution state is assigned to the execution Component. The explicit contract and independent lifecycle are split evidence.

If two Behaviors update a balance and its reserved amount under the invariant `reserved <= balance`, and the model provides no cross-boundary consistency protocol, the atomic invariant requires one authority seed and one Component boundary.

## Inputs, derived information, and functional Components

A supplier observation whose truth remains externally established is `external-input`. If the system accepts or normalizes it into mutable internal state with its own validity transitions, that representation instead needs an authority. The protocol adapter that fetches the observation does not become that owner merely because it emits it.

A deterministic `charging-rate-estimate` calculated from observations remains `derived`; that classification says only that the information has no independent authoritative transitions. A model-backed Charging Estimation responsibility may nevertheless pass the Component Necessity Test and become a Component. Caching does not create authority, while independent persistent update, validity, finalization, invalidation, consistency, or reconciliation rules require authority analysis.

A protocol adapter that translates messages, retries transport, and authenticates to an external system is not a Component merely because it has its own package. It can become one when modeled observation/integration responsibility supplies a functional foundation and a separate runtime boundary passes the Necessity Test. Every modeled Behavior still belongs to exactly one passing Component.

## Functional configuration

`fallback-charging-rate` is Domain Information when changing it alters charging decisions or results. Deployment may state that the implementation receives it through `CHARGING_RATE_SOC_PER_HOUR`. HTTP ports, SQLite paths, mounts, and restart policies remain technical Deployment configuration.

## Infrastructure responsibility without authority transfer

A Deployment requirement mandates atomic durable storage of state owned by Planning, Vehicle Observation, and Charging Control. A Persistence candidate may PASS when atomic commit/rollback forms one necessary technical lifecycle with a justified boundary and explicit participant contracts. It uses `kind: infrastructure`, has no artificial Pulse Behaviors, and cites the Deployment requirement as `requirement-evidence`. Persistence owns transaction state, connection handling, durable representation integrity, and rollback mechanics; the participating functional Components still decide which domain transitions are valid and own their Domain Information authority.

A runtime composition candidate may similarly PASS when Deployment requires one process to compose and supervise several Components and that composition has an independently necessary startup/shutdown or failure-containment lifecycle. `main.go`, a package, or dependency wiring alone is not evidence. Functional startup decisions—such as whether Charging Control establishes a fail-safe command—remain with the functional owner even when the composition Component orders invocation.

A shared tariff calculation used by Planning and Economics is not infrastructure merely because several Components call it. If it expresses domain-functional cost meaning, discovery evaluates it as functional responsibility and applies merge/split normally. The same rule prevents a coordinator such as `service.go` from being labeled infrastructure solely because it calls several Components.

## Reconciliation

Suppose Charging Estimation cannot establish a valid estimator until Vehicle Observation has established a reusable valid observation. Charging Estimation may declare `reconciliation.requires: [vehicle-observation]`. This is stronger than merely reading observed Domain Information. At startup both Components are `UNRECONCILED`; Vehicle Observation reconciles first, then Charging Estimation. If Vehicle Observation loses validity, invalidation propagates to Charging Estimation and the affected graph reconciles again.

Ordinary vehicle-state change is handled through Pulse and does not automatically invalidate either Component. No Startup Manager Component is introduced; dependency execution is general Component runtime mechanics.

## Realization reconciliation

After approval, Go source, tests, HTML, templates, JavaScript, CSS, and SQL are each reconciled to exactly one Component ownership. A folder per Component may help, but no file mapping is stored in `components.yaml` and a generic `shared` folder cannot evade ownership.

A common technical interface belongs to the Component whose invariant or lifecycle it defines. A broad integration test belongs to the Component contract or authoritative outcome it primarily verifies; using other Components as setup does not make it shared. Split a test that independently verifies several authorities. Create an integration or composition Component only when that responsibility itself passes the Necessity Test and architecture review.

An inventory with an unassigned SQL migration is FAIL / INCOMPLETE even when all application code is assigned. Assigning it to `shared` is equally invalid. A Go file that both decides whether a charging plan is acceptable and implements generic transaction rollback remains mixed: it must be split, verified as one cohesive responsibility, or evaluated through an explicit normative architecture change and then verified against the changed architecture. Merely recording that architecture review occurred, proposing a Component, or placing one candidate owner in a table does not resolve ownership and cannot contribute to PASS.

## FAIL and UNRESOLVED

A formatter reads an accepted result and produces display text. If the semantic model contains no independently identifiable presentation responsibility or requirement requiring a separate runtime boundary, its algorithm and reason to change alone do not supply a functional foundation and it FAILs. Modeled presentation responsibility can instead be a legitimate candidate, but still must pass boundary necessity.

Suppose a Behavior emits `approved-request`, while requirements do not say whether a later Behavior must independently accept it or whether both transitions must be atomic. The evidence points both toward a transfer contract and toward possible shared authority. Discovery must record UNRESOLVED/model finding; it must not select a split or merge from naming, code structure, or intuition.
