# CPU History Migration v1

Status: Normative CPU methodology.

## 1. Purpose and scope

History Migration preserves the required meaning, integrity, and traceability of durable domain history when an implementation or its domain representation changes. It applies within one system as well as between implementations. It is technology-neutral and does not prescribe a database, event log, migration engine, or deployment strategy.

This procedure does not add a CPU artifact, Domain Information type, Component kind, or runtime state. The five-file semantic base model and optional Component architecture remain authoritative. A migration must not silently redefine domain meaning to fit existing stored data.

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
