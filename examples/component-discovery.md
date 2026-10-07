# Component Discovery examples

Status: Non-normative examples of the normative method in `CPU/PROCESS/CPU-Component-Discovery.md`.

These examples are deliberately small. A real discovery must evaluate the complete base model and must not treat a pattern below as an automatic boundary rule.

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

## Reconciliation

Suppose Charging Estimation cannot establish a valid estimator until Vehicle Observation has established a reusable valid observation. Charging Estimation may declare `reconciliation.requires: [vehicle-observation]`. This is stronger than merely reading observed Domain Information. At startup both Components are `UNRECONCILED`; Vehicle Observation reconciles first, then Charging Estimation. If Vehicle Observation loses validity, invalidation propagates to Charging Estimation and the affected graph reconciles again.

Ordinary vehicle-state change is handled through Pulse and does not automatically invalidate either Component. No Startup Manager Component is introduced; dependency execution is general Component runtime mechanics.

## Realization reconciliation

After approval, Go source, tests, HTML, templates, JavaScript, CSS, and SQL are each reconciled to exactly one Component ownership. A folder per Component may help, but no file mapping is stored in `components.yaml` and a generic `shared` folder cannot evade ownership.

## FAIL and UNRESOLVED

A formatter reads an accepted result and produces display text. If the semantic model contains no independently identifiable presentation responsibility or requirement requiring a separate runtime boundary, its algorithm and reason to change alone do not supply a functional foundation and it FAILs. Modeled presentation responsibility can instead be a legitimate candidate, but still must pass boundary necessity.

Suppose a Behavior emits `approved-request`, while requirements do not say whether a later Behavior must independently accept it or whether both transitions must be atomic. The evidence points both toward a transfer contract and toward possible shared authority. Discovery must record UNRESOLVED/model finding; it must not select a split or merge from naming, code structure, or intuition.
