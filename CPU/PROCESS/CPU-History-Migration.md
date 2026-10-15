# CPU History Migration v1

Status: Normative CPU methodology.

## 1. Purpose and scope

History Migration preserves the required meaning, integrity, and traceability of durable domain history when an implementation or its domain representation changes. It applies within one system as well as between implementations. It is technology-neutral and does not prescribe a database, event log, migration engine, or deployment strategy.

This procedure does not add a CPU artifact, Domain Information type, Component kind, or runtime state. The five-file semantic base model and optional Component architecture remain authoritative. A migration must not silently redefine domain meaning to fit existing stored data.

## Normative timestamp storage representation

All **new CPU-system implementations** shall persist timestamps as integer Unix epoch seconds (seconds elapsed since 1970-01-01T00:00:00Z, UTC). This applies to operational records, historical facts, event times, receipt times, audit timestamps, migration metadata, and timestamp columns inside persisted payloads. A human-readable date, localized time string, floating-point epoch, or epoch milliseconds/microseconds/nanoseconds is not the canonical durable timestamp representation. Calendar-only domain values (for example a local electricity-price day) are not timestamps and require separately specified semantics.

Preserve distinct domain instants separately (for example source time versus receipt time); conversion must not collapse their identities. Define and test the precision-loss policy where a source has subsecond precision, including boundary behavior. UTC epoch seconds are a storage representation, not a replacement for explicit timezone rules when interpreting local calendar days or deadlines.

For replacement systems, **retain original legacy data unchanged** as migration evidence even if its timestamps use text or another representation. New active storage and all newly written timestamp values must use integer epoch seconds. Read-only compatibility adapters may parse old timestamp representations only when their source encoding and timezone semantics are proven; otherwise classify the mapping as unresolved. Do not silently rewrite legacy records or assume lexicographic timestamp ordering is chronological. Require copy-based migration tests, exact instant preservation at supported precision, bounded historical queries, restart and rollback verification. Persisted schema and payload checks must prevent introducing nonconforming timestamp fields.

## Normative timestamp representation across runtime boundaries

All **new CPU-system implementations** shall also represent transient timestamp
values as integer Unix epoch seconds in UTC. This covers in-memory domain
facts, Component interfaces, pulses, events, commands, queues, caches, internal
API payloads, and intermediate calculations when a value denotes an instant.
The same canonical representation applies whether or not the value is persisted.
Fractional Unix epochs, epoch milliseconds, formatted timestamp strings and
language-native date/time objects are not canonical timestamp values at these
boundaries.

Adapters may convert at external protocol, operating-system clock, database
compatibility, and human-presentation boundaries, but must normalize immediately
on entry and convert only at the boundary on exit. A local calendar date, wall
clock time, duration, time zone identifier, or interval length is not itself a
timestamp; its semantics and conversion to an instant must be specified
separately. Any subsecond source instant requires an explicit deterministic
precision-loss and interval-boundary policy. Do not silently mix precisions
or treat a timezone offset as an epoch unit.

These rules are **implementation representation constraints**, not a reason to
encode technical timestamp types in Context, Pulse or UI. The semantic model
must still normatively specify each historically significant instant's meaning,
origin, temporal relationship, identity, completeness and retention requirements.
Executable tests demonstrate compliance but cannot be the sole source of these
contracts. Before accepting an implementation, review whether reconstructing
historical facts and lifecycle outcomes from the model plus approved contracts
would require undocumented implementation or test knowledge; unresolved gaps
block acceptance.

## 1a. Replacement-system storage compatibility gate

When a new implementation will replace an existing deployed system, assess compatibility with the existing durable data **before** selecting or accepting a new storage representation. Greenfield functional architecture does not imply greenfield persistence. This assessment is mandatory even when the new implementation was developed independently of the old implementation.

Inventory the existing storage schema, version, historical semantics, required current state, and upgrade/rollback constraints as compatibility inputs. Compare them with the new implementation's information contracts and Component authority boundaries. Prefer preserving the established durable representation where that satisfies the normative functional model; changing it requires an explicit, evidenced reason, not merely implementation convenience or architectural independence.

Decide and record whether each existing information set can be read and written compatibly, needs additive schema evolution, requires a validated transformation, or cannot be supported without a domain decision. Treat the source database as immutable during assessment and test changes on a copy. Verify old data can be interpreted correctly, not just that its tables can be opened. Never preserve an obsolete functional interpretation merely to retain a physical schema.

If compatibility is feasible, use it as the default replacement strategy, subject to functional correctness and reconciliation. If it is not feasible, follow the full History Migration contract and acceptance procedure below. A replacement project must not declare its persistence design complete while required legacy-data compatibility remains unassessed or unresolved.

### Design-time evidence and acceptance

Before replacement persistence design is approved, record the source schema/version, historical and current-state inventory, functional information owners, compatibility or transformation decision for each information set, preservation invariants, transaction constraints, unresolved exceptions, and verification and rollback plan. Where existing durable data is absent, document verified non-applicability. Missing required evidence blocks persistence realization, even when ordinary implementation tests pass.

This early gate is distinct from the later migration execution and cutover acceptance gate. A preliminary compatibility assessment does not establish that actual historical data can already be migrated or safely used in production.

## 1b. Durable storage fitness review

For every system with durable information, including new systems, review storage fitness before approving persistence realization. Distinguish bounded operational state, growing history and rebuildable data. Document expected observation rates, retention, growth, read and write amplification, recovery cost, record identity, uniqueness, ordering, provenance, transaction safety, schema evolution and backup. Specify whether guarantees are enforced in storage or application code and how they are tested. Full-snapshot rewrites of growing history require explicit evidence that cost and integrity remain acceptable. No database technology is prescribed.

Missing growth assumptions, unverified integrity constraints or unjustified full-history rewrites block persistence realization.

For growing durable histories, normal operational updates and individual observations must not depend on reading or rewriting unrelated accumulated history. Verify incremental record writes, bounded historical queries, record identity, and atomic cross-Component commits before accepting persistence realization. Functional test success alone does not establish storage fitness. A stricter project-specific persistence constraint remains binding.
 Store review evidence in the project repository without adding normative YAML.

## 2. Applicability gate

Before an increment changes durable data representation, functional interpretation, authority, or the ability to reconstruct required historical outcomes, determine whether existing durable domain history is affected. If it is, History Migration review is mandatory. Pure code changes that preserve representation, interpretation, authority, and access to required history do not trigger this process.

Record the applicability decision and evidence in a repository-backed increment record. If no history exists, verify and record that fact rather than inventing migration work. Technical transient caches without historical authority may be rebuilt under ordinary Component reconciliation, provided no required information is lost.

## 3. Discovery

Inventory the affected historical information and its currently observable meaning, source and destination representations, relevant domain invariants, provenance, identifiers, ordering, timestamps, completeness constraints, retention obligations, and affected Components. Distinguish authoritative history, derived materializations, current functional state, and technical persistence state. Do not infer functional authority from the storage mechanism.

Derive the intended destination meaning from the current normative CPU model and approved Component architecture, not from legacy schema convenience. Identify information that is missing, ambiguous, corrupt, duplicated, or semantically incompatible. Historical information that cannot be interpreted reliably must not be silently fabricated.

## 4. Migration contract

Before execution, record a reviewable contract for each affected historical information set:

- Source and destination meaning and relevant version or schema identity.
- Responsible functional authority and technical execution responsibility, consistent with the approved Component architecture.
- Explicit disposition: **preserved**, **transformed**, or **unmigratable**. These are review outcomes, not CPU runtime states.
- Mapping and transformation rules, including units, timezone, ordering, identifiers, missing values, and semantic changes where applicable.
- Preservation invariants, accepted exceptions, and measurable completeness/reconciliation checks.
- Failure and interruption behavior, retry or restart safety, visibility/activation boundary, and recovery or rollback strategy.
- Evidence needed to approve cutover, including representative and adverse test cases.

**Preserved** means the required domain meaning remains unchanged. **Transformed** means an explicit, validated transformation yields the intended domain meaning, including documented limitations. **Unmigratable** means faithful migration cannot be established. Unmigratable required history blocks cutover until an explicit domain-level disposition is approved; omission or approximation must never be disguised as preservation.

Do not demand a universal one-to-one record mapping: merging, splitting, re-keying, or rebuilding derived history may be valid when semantic invariants and completeness are verified.

## 5. Execution and reconciliation

Migration may run in stages. A global transaction is not required, but partially migrated, invalid, or unverified history must not be exposed as authoritative. Define a clear activation boundary and isolate or reject writes that would make source/destination reconciliation indeterminate; where concurrent writes are supported, specify and test capture, replay, ordering, and cutover consistency.

Execution must be safe to retry or resume after interruption without duplicate or contradictory authoritative outcomes. Idempotence is required of the externally observable migrated result, not of every internal step.

Use existing Component reconciliation to establish valid runtime state after migration. A Component must not become RECONCILED while its required migrated history or invariants are unverified. Reconciliation prerequisites must be justified by actual validity dependencies, not ordinary reads or call direction. Infrastructure persistence Components retain only their technical authority; migration does not transfer domain information authority to them.

## 6. Verification and acceptance

Verify both technical integrity and domain correctness. Compare source and destination using appropriate identities, counts or totals, temporal boundaries, provenance, lifecycle transitions, and domain invariants; counts or checksums alone are insufficient proof of semantic equivalence.

Exercise at minimum: representative records, empty history, missing/invalid data, duplicate or out-of-order input where applicable, interrupted execution, repeated execution, and boundary conditions introduced by transformations. Record deviations and their approved treatment.

Cutover is permitted only after all required history is preserved or validly transformed, exceptions are explicitly accepted by the appropriate decision maker, completeness and invariants pass, and affected Components can reconcile. If verification fails, keep the destination non-authoritative and follow the documented recovery strategy. Do not report migration success from execution completion alone.

## 7. Evidence and realization

Keep the applicability decision, inventory, migration contract, verification evidence, accepted exceptions, and cutover decision in durable project-repository artifacts. This methodology does not prescribe an additional normative YAML file or a global registry. Requirements with enduring domain significance belong in the existing normative Requirements attachments.

Migration implementation artifacts, including code, SQL, scripts, and tests, must have unambiguous Component realization ownership when an approved Component architecture exists. Apply existing realization reconciliation rules; do not create a generic migration Component by default.

## 8. Review checklist

History Migration review is complete only when applicability, authority, semantic mapping, completeness, provenance, retry safety, failure isolation, activation, reconciliation, tests, exceptions, and cutover evidence have been explicitly resolved. A missing required answer is a blocking finding, not an implicit approval.
