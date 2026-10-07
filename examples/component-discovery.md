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

## Inputs, derived information, and adapters

A supplier observation whose truth remains externally established is `external-input`. If the system accepts or normalizes it into mutable internal state with its own validity transitions, that representation instead needs an authority. The protocol adapter that fetches the observation does not become that owner merely because it emits it. A deterministic risk score calculated from the observation and authoritative account state is `derived`; caching it does not create authority, but an independently governed persistent score lifecycle would. The calculation is an internal responsibility unless it owns a qualifying lifecycle or invariant boundary.

A protocol adapter that translates messages, retries transport, and authenticates to an external system is normally an implementation element outside the Component list. It becomes a Component candidate only if the CPU semantics establish qualifying persistent authority and boundary necessity, not simply because the adapter has its own package or failure modes. If adapter-like work is itself modeled as a Pulse Behavior, that Behavior must still be absorbed into exactly one passing Component before `components.yaml` can exist.

## FAIL and UNRESOLVED

A formatter reads an accepted result and produces display text. Its algorithm and reason to change are distinct, but it owns no mutable information, lifecycle, or cross-transition invariant. It therefore FAILs the Necessity Test and remains presentation or an internal module.

Suppose a Behavior emits `approved-request`, while requirements do not say whether a later Behavior must independently accept it or whether both transitions must be atomic. The evidence points both toward a transfer contract and toward possible shared authority. Discovery must record UNRESOLVED/model finding; it must not select a split or merge from naming, code structure, or intuition.
