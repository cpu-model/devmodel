# CPU Component Discovery

Status: Normative methodology.

## 1. Purpose and status

CPU's concrete semantic base model remains `context.yaml`, `pulse.yaml`, `ui.yaml`, `deployment.yaml`, and `requirements.yaml`. `components.yaml` is an optional complementary normative Component architecture artifact derived from that complete base model without changing it.

If `components.yaml` is absent, CPU makes no normative Component-boundary claim. If present, its Component boundaries, Behavior assignments, Domain Information authority or disposition assignments, and reconciliation prerequisites are normative. Changing them requires an explicit model change and human review. A change to any semantic base-model file requires an impact review of the approved Component architecture; update `components.yaml` only if its responsibilities, assignments, dispositions, or reconciliation prerequisites are affected.

A **Component is a cohesive, necessary, and bounded part of the system that owns an identifiable responsibility and the normative runtime implementation boundary that realizes that same responsibility.**

The responsibility may be **functional**—domain behavior, observation, decision, calculation, presentation, safety, or state—or **infrastructural**—process composition, technical configuration, persistence, transactions, transport, communication, coordination, or another necessary realization mechanism. These are responsibility categories within one Component concept. They do not create separate logical, runtime, functional, or technical Component models.

There is one Component concept, not separate logical and runtime Components. The reviewed responsibility determines the Component; runtime artifacts realize that same Component. A Component does not automatically correspond to a file, package, directory, process, service, repository, database, container, or deployment unit. Deployment continues to describe concrete physical realization.

Component Discovery is model-first. Functional responsibility discovery begins with Context, Pulse, UI, and Requirements. Infrastructure responsibility discovery begins with Deployment and normative realization requirements. Neither begins from files, packages, processes, deployment units, or an existing implementation. Existing implementation is examined through realization reconciliation in section 9 and may expose a necessary responsibility that the approved architecture omitted; it never makes its current structure normative or retroactively determines the initial proposal. For a Go implementation, the subsequent Component Package Realization activity in section 10 derives package boundaries only after the Component architecture is approved; package concerns never alter this discovery sequence.

## 2. Interpretation principles

- Authority is strong Component-boundary evidence, not a prerequisite for every Component.
- Authority granularity is not Component granularity. One Component may own several compatible authorities; separate state or authority does not automatically require separate Components.
- A Capability is cohesion evidence, not a Component boundary. Several Capabilities may belong to one Component and one Capability may require several Components.
- A Pulse crossing identifies possible causal interaction, not ownership or reconciliation dependency.
- `information-out` makes a Behavior an authority candidate for emitted information; it does not establish eventual Component authority.
- Reading information does not confer authority and does not imply a reconciliation prerequisite.
- An external adapter does not own internal domain state merely because it delivers an observation. Persistence does not own state merely because it stores it.
- Observation, integration, calculation, estimation, projection, presentation, safety/failure isolation, reconciliation, persistence, transport, transaction, and composition responsibilities may be legitimate Components when the applicable model and realization evidence supply a cohesive foundation and the Necessity Test requires a separate runtime boundary. The category alone never creates a Component.

Authority means the runtime implementation authority permitted to accept or establish relevant mutable state transitions and responsible for protecting their invariants.

An infrastructure Component may own its own technical state and invariants, such as transaction lifecycle, connections, delivery attempts, durable representation integrity, or recovery mechanisms. It does not automatically own the functional state handled by that mechanism. Transport conveys information without accepting its domain truth; persistence stores and retrieves an owner's state without deciding its functional transitions; restoration re-establishes an owner's valid state without changing who defines its invariants; coordination orders or atomically combines participant operations without taking their decisions; a functional decision accepts or establishes a domain-significant result under the deciding Component's authority.

## 3. Functional configuration

A configuration value with domain-functional meaning whose change can alter functional decisions, results, or domain behavior is Domain Information. Deployment may additionally describe how the implementation receives that value. For example, `fallback-charging-rate` is Domain Information even when Deployment supplies it through `CHARGING_RATE_SOC_PER_HOUR`.

Purely technical configuration remains in Deployment, including HTTP ports, SQLite paths, mounts, and container restart policies. Delivery mechanism does not determine semantic classification.

## 3A. Substitutability Discovery — mandatory pre-discovery gate

Before beginning Component Discovery, perform and close a separate **Substitutability Discovery** against the current validated five-file semantic base model. This gate is mandatory whenever Component Discovery is undertaken, including when no substitutable responsibilities are ultimately approved. It does not make `components.yaml` mandatory for other CPU work.

1. **Candidate inventory:** Examine Context, Pulse, UI, Deployment, and Requirements for realistically replaceable responsibilities, including integrations, information providers, algorithms, and realization mechanisms where supported by model evidence. Identify candidates by responsibility and semantic evidence, **not** by proposed Component IDs, source files, packages, or implementation structure. Do not begin Component Discovery while compiling candidates.
2. **Assessment:** For each candidate, describe its responsibility, consumers, expected functional contract, plausible alternative realizations, reason for substitution, constraints, and uncertainty. Technical replaceability alone is not sufficient reason to recommend approval.
3. **Human decision:** Present the complete candidate inventory together for explicit accept/reject decisions and allow human additions. No candidate may remain undecided when the gate closes. Rejected candidates must not silently reappear during Component Discovery.
4. **Contract normalization:** For each accepted responsibility, specify stable information semantics, operations/behavior, errors and recovery, safety and lifecycle guarantees, and the replacement criterion. Distinguish the provider-independent contract from requirements of the currently selected provider. Existing provider-specific Context and Deployment descriptions may remain concrete; they must not be mistaken for universally required contract semantics. Resolve contradictions through an explicit, reviewed base-model change before proceeding.
5. **Freeze and evidence:** Record approved normative substitution constraints as independently assessable requirements in `requirements.yaml`, attached to existing valid model addresses. Preserve a reviewable candidate/decision/contract-evidence report in the project repository; this report is not another normative CPU YAML artifact. Explicitly record closure even if the accepted set is empty. Do not invent a new YAML field or unaddressable target.

The minimum default replacement level is **source-level substitution**: an alternative implementation may be selected through source composition and rebuilding, but its consumers and the approved common functional contract must not need modification. Runtime hot swapping, multiple concurrent providers, automatic fallback, or dynamic selection are **not** implied; they require separate functional requirements if needed.

Approved substitution constraints are **binding Component-boundary evidence**, not automatic one-Component-per-provider or one-Component-per-contract rules. During the Necessity Test, demonstrate a stable boundary that keeps provider-specific implementation details out of consuming responsibilities and permits independent replacement. Several alternatives may realize the same normative Component responsibility. An interface declaration alone is not evidence of functional substitution; the contract must be independently verifiable. If a constraint conflicts with a proposed Component boundary, report the conflict and stop rather than weakening or reopening the approved decision implicitly. A change to an approved substitution decision requires a separate human-reviewed architecture decision and corresponding normative requirements update.

## 4. Discovery procedure

Perform Component Discovery only after the mandatory Substitutability Discovery gate in section 3A has been closed and its approved requirements incorporated into the validated base model. Then proceed in this order:

1. Read and strictly validate the complete current semantic base model.
2. Create a Behavior–Information inventory with relevant requirement IDs, and a Deployment–realization inventory of required process composition, technical configuration, persistence, transactions, transport, communication, coordination, and recovery mechanisms.
3. Classify every Domain Information item as mutable internal authority, external input or fact, immutable transfer or result, or derived information. Record uncertainty rather than guessing.
4. Identify cohesive functional responsibilities evidenced by Context, Pulse, UI, and Requirements, including authority, invariants/lifecycles, observation/integration, calculation/estimation/projection, presentation, safety/failure isolation, and reconciliation responsibility.
5. Identify infrastructure responsibility candidates evidenced by Deployment and normative realization requirements. Record the concrete required mechanism, its technical invariant or lifecycle, its contracts with functional or other infrastructure Components, and why an independently identifiable implementation boundary may be necessary. Do not derive candidates from existing file or package organization.
6. Identify candidate authorities and inventory functional and technical invariants, acceptance transitions, persistent lifecycles, supporting state, and failure/ordering/non-interference rules. Trace all findings to normative evidence.
7. Form small responsibility seeds around responsibilities that initially need to remain coherent. Do not form seeds from implementation structure.
8. Identify producer/acceptor, owner/mechanism, participant/coordinator, and other explicit contracts between seeds.
9. Use Capability membership as additional functional cohesion evidence, never as an automatic boundary.
10. Apply the merge/split test in section 5.
11. Apply the Component Necessity Test in section 6 to every candidate.
12. Absorb failed candidates into a passing Component where responsibility and authority remain coherent. A technical helper that fails the test realizes exactly one passing Component; it does not receive a separate Component entry.
13. Verify that every Pulse Behavior has exactly one proposed Component and every Domain Information item has exactly one authority or non-authoritative disposition. Infrastructure Components need not artificially own either.
14. Define reconciliation prerequisites only where validity establishment truly requires another Component to be RECONCILED. Do not derive them from ordinary information reads or technical call direction.
15. Record unresolved boundaries and model or realization findings explicitly.
16. Submit the proposal and evidence to human review. An analysis agent is not the final architecture authority.
17. Condense only the approved result into `components.yaml`.

The inventories, decision logs, merge/split analysis, and alternatives are discovery work, not additional normative CPU artifacts.

Domain Information outcomes are mutually exclusive:

- **mutable internal authority** maps to `authority`;
- **external input or fact** maps to `external-input` while relevant truth remains externally established;
- **immutable transfer or result** maps to `transfer` when it has no continuing mutable lifecycle;
- **derived information** maps to `derived` when reproducible from other information and without independently authoritative transitions.

`derived` classifies information authority status. It does not place the deriving function outside Component architecture. For example, `charging-rate-estimate` may be `derived` while a Charging Estimation Component realizes the normative estimator function. Persistent derived information with independent update, validity, finalization, invalidation, consistency, or reconciliation rules must instead be analyzed as authority.

## 5. Merge/split test

For each pair or group of candidates ask:

- Do they realize one cohesive identifiable responsibility?
- Do they exercise the same authority?
- Must transitions be atomic to protect one invariant?
- Is there an explicit producer/acceptor contract?
- Can a recipient independently accept, reject, activate, supersede, suspend, or end the result?
- Does safety, consistency, failure isolation, ordering, or non-interference require a boundary?
- Do they have independently identifiable lifecycles or reconciliation responsibilities?
- Would merging or splitting obscure a runtime responsibility required by the model?
- For infrastructure candidates, would separation isolate a real technical invariant or lifecycle, or merely create a helper, library, or organizational layer?

Transitions that must be atomic under one invariant are merged unless the base model defines a consistency protocol across the boundary. Exclusive safety or consistency authority is not duplicated. An explicit result contract with independent acceptance remains separable unless a documented merge preserves both responsibilities. Independently identified lifecycles and required failure isolation are not silently collapsed.

Timing, external dependencies, retry patterns, persistence, and observed implementation coupling are heuristics only. The same subject, Capability, external system, database, process, View, or frequent information read never justifies a merge or split by itself. Conflicting mandatory conclusions produce UNRESOLVED, not hidden design intuition.

## 6. Component Necessity Test

Run this after merge/split analysis and before proposing the normative architecture.

### Phase A — normative responsibility foundation

A functional candidate must have semantic evidence for an independently identifiable runtime responsibility. Evidence may include:

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

An infrastructure candidate must have all of:

- an identifiable technical responsibility;
- a concrete need established by Deployment and normative realization requirements;
- a cohesive technical invariant or lifecycle;
- a justified implementation boundary;
- clear contracts with other Components; and
- no unjustified transfer of functional authority.

Without the applicable normative foundation the candidate is **FAIL**. A file, package, library, framework, helper, database, transport, or preference for separate code organization is never foundation by itself. Component architecture never invents functionality or infrastructure absent from the complete model and normative realization requirements.

### Phase B — boundary necessity

Normative foundation is necessary but insufficient. The responsibility must genuinely require a separate cohesive runtime Component boundary. Evidence includes ambiguous authority or invariant ownership if merged, an independent functional or technical lifecycle, required safety/consistency/failure isolation, normative ordering or non-interference, independent reconciliation responsibility, a necessary owner/mechanism contract, or another model-backed reason that the runtime responsibility must remain separately identifiable. Apply the merge/split test to infrastructure candidates as rigorously as to functional candidates; do not create a Component for every helper or technical function.

The result is:

- **PASS** — a normative Component boundary is required;
- **FAIL** — the responsibility is realized within another Component or remains implementation-only; or
- **UNRESOLVED** — the base model lacks enough semantics and human review is required.

A file, package, View, algorithm, cadence, external source, library, database, container, deployment unit, or reason to change is never sufficient alone. Small implementation size does not demote a real responsibility. Every modeled Behavior must be assigned to exactly one passing Component before `components.yaml` can be created. A behaviorless functional Component still needs explicit functional grounding; a behaviorless infrastructure Component is expected to use Deployment requirement evidence and must not claim unrelated Pulse elements merely to satisfy the format.

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

Reviewing a mixed or disputed artifact is not resolution by itself. Review has exactly four possible outcomes: (1) the artifact is semantically verified to realize one approved Component responsibility and receives that single owner; (2) the artifact is split so each resulting artifact has one verified owner; (3) an explicit reviewed change to the normative Component architecture establishes the necessary responsibility and the artifact is then verified against it; or (4) the ownership remains unresolved. Only the first three outcomes can close the finding, and each requires an actual unambiguous ownership result. A review record, candidate owner, or proposed architecture change without that result remains outcome 4 and blocks PASS.

Current implementation may reveal a necessary responsibility during realization reconciliation, including a transaction, persistence, composition, transport, or coordination boundary not identified initially. The implementation structure itself is not evidence that the boundary is necessary. Record the candidate, apply the same merge/split and Necessity Tests using Deployment and normative realization requirements, and obtain explicit architecture review before adding or changing a Component. Until approval, reconciliation remains incomplete.

Common technical contracts are owned by the Component whose invariant or lifecycle the contract defines. If a contract genuinely defines a separate necessary transport, transaction, composition, or coordination responsibility, that infrastructure candidate must independently pass the Necessity Test. Broad integration and acceptance tests are owned by the Component whose contract or authoritative outcome they primarily verify; setup and calls into other Components do not make a test shared. A test that verifies multiple Components' independent authorities or contracts must be split where practical. If its indivisible scope is itself a necessary integration or composition contract, the corresponding candidate requires explicit architecture review and the Necessity Test before the test can be assigned to it.

### Mandatory realization-reconciliation closure gate

Realization reconciliation is **not complete** merely because the normative Component model validates, tests pass, or selected runtime responsibilities have been reviewed. Before reporting completion, the implementing agent must:

1. Establish a reproducible, exhaustive inventory of the current repository's system-realizing source artifacts, including Go source and tests, HTML, templates, JavaScript, CSS, SQL, and equivalent source artifacts. Explicitly state inclusion and exclusion rules; exclude generated, vendored, and non-system artifacts only with a documented rationale.
2. Assign **exactly one** approved normative Component to each in-scope artifact. Record the file-to-Component mapping in a reviewable realization-reconciliation report, **not** in `components.yaml`. Do not use a generic shared/unowned classification as a substitute for ownership.
3. Review each assignment against the Component's normative responsibility and the actual implementation, not merely file names, folders, or package names. Identify mixed-responsibility artifacts and either split them where appropriate or report a concrete boundary question for human review.
4. Report the inventory total, assigned total, unassigned/ambiguous total, exclusions, and every unresolved finding, with enough file-level evidence to audit the result. Check mechanically that every in-scope artifact appears exactly once; semantic correctness still requires review.
5. State an explicit **PASS** only when coverage is exhaustive, every artifact has one semantically verified owner under the approved normative Component architecture, and no unresolved realization-boundary findings remain. Architecture review alone never closes a finding: any approved architecture change must first be reflected normatively and the affected artifacts must then be verified against it. Otherwise report **FAIL / INCOMPLETE**, identify the blocking findings, and do not declare Component realization or realization reconciliation complete.

The review report is implementation evidence, not a new normative CPU model artifact. If completion status must survive a chat or increment boundary, preserve the evidence and findings in the project repository according to its working instructions. A successful automated coverage check cannot substitute for semantic ownership review.

## 10. Component Package Realization

Component Package Realization is a mandatory post-discovery activity when an approved Component architecture is realized in Go. It begins only after `components.yaml` has been approved and validated. It does not reopen, replace, or adapt Component Discovery to Go, and it never derives Components from packages. `components.yaml` remains the sole normative source of Component identity and responsibility.

The activity refines realization reconciliation for Go. It establishes package boundaries, explicit APIs, and executable dependency rules while preserving exactly one semantic owner for every in-scope source artifact. A Component may additionally own HTML, templates, CSS, JavaScript, YAML, SQL, tests, generated inputs, and equivalent artifacts; those artifacts remain covered by the section 9 ownership gate even when they are embedded in or used by its Go package.

### 10.1 Default package rules

The following defaults apply to all in-scope Go source, including generated Go, internal tests, and external test packages:

1. A Go-based Component is realized by exactly one primary Go package.
2. A Go package realizes at most one Component.
3. Package structure follows the approved Component structure. Existing directories, package names, imports, or dependency cycles never justify changing Component identity or boundaries.
4. A Component's primary package owns its implementation, invariants, Component-facing API, and Component-owned types. Files in `package main` belong to the approved composition Component when one exists; otherwise they must remain a thin assembly entry point whose ownership is resolved under section 9.
5. Tests belong to the Component contract or authoritative outcome they primarily verify. A Go external test package such as `x_test` remains owned by the same Component as package `x`; it is not a separate Component or an unowned package.
6. One Component spanning several Go packages, several Components sharing one Go package, or a package with no Component owner is an exception or an unresolved realization defect. It is never silently accepted as ordinary organization.

The default is intentionally about packages, not directories alone: every non-test `.go` file in one directory must declare one package as Go requires, but directory proximity does not prove Component ownership. Generated Go code is assigned through its maintained source or generation responsibility and checked in the effective package inventory; an exclusion requires the same explicit treatment as any other exception.

### 10.2 Inputs and inventory

Start from the approved Components and the exhaustive artifact ownership established by section 9. Record a package-realization table that references Component IDs from `components.yaml`; it must not redeclare Component names, responsibilities, Behaviors, authorities, or dispositions.

Inventory the effective Go build for every supported module, build target, build tag set, operating system, and architecture that the project's Deployment and build instructions require. Use the Go toolchain as the primary source of package truth:

- `go list -json -deps -test` for package identity, files, imports, test variants, generated-file participation, module membership, and dependency edges;
- `golang.org/x/tools/go/packages` when typed syntax, symbol use, interface satisfaction, or build-configuration-aware analysis is needed;
- `go vet`, the compiler, and established analyzers such as Staticcheck for the checks they reliably provide.

Do not create a general Go parser, infer dependencies with regular expressions, or treat `go mod graph` as a package dependency graph. If cgo, generated sources, build tags, workspaces, or multiple modules make the inventory configuration-dependent, enumerate and test the supported configurations rather than analyzing an unspecified union.

For every package, inventory:

- its owning Component ID and whether it is that Component's primary package;
- all production and test import edges to other in-scope packages;
- cross-Component function and method calls;
- cross-Component named-type, alias, constant, variable, and interface use;
- compile-time and runtime interface satisfaction relevant to Component contracts; and
- shared mutable state, registration, callbacks, and initialization effects that couple Components even when no direct call is visible.

Reflection, dynamic loading, code generation, serialization, SQL, templates, JavaScript, and process or network interaction can create relationships that the Go import graph cannot prove. Record and verify those relationships with appropriate focused tests; never claim that import analysis alone proves their absence.

### 10.3 Derive and implement the target structure

For each Go-based Component, select one primary package whose import path is stable within the repository and whose API expresses that Component's approved responsibility. Then:

1. Assign every in-scope Go package and Go file to exactly one approved Component.
2. Move or split implementation so the normal one-Component/one-package defaults hold.
3. Define the allowed directed Component dependency graph from reviewed Component contracts and actual required collaboration. Call direction and import direction are realization decisions; neither creates Pulse causality, Domain Information flow, authority, or reconciliation prerequisites.
4. Make cross-Component use pass through explicit, minimal APIs. Keep implementation-only identifiers unexported and use Go's `internal` visibility where it materially enforces the intended scope.
5. Remove package globals or registries that expose mutable state across Component boundaries. Shared state must have one Component authority and be accessed through that owner's API, or be immutable value transfer with explicit semantics.
6. Re-run the complete artifact ownership review for moved Go and non-Go artifacts and preserve one unambiguous owner for each.

Package names need not equal Component IDs, but the mapping must be explicit and unique in the package-realization report and executable architecture checks. A `cmd` package, adapter package, persistence package, generated package, or test-support package is not exempt merely because its conventional Go role sounds technical.

### 10.4 API and semantic ownership rules

Public API means the identifiers and behavior intentionally available across a Component boundary, whether or not the package can technically be imported by additional callers. Export only the smallest contract required by approved collaboration.

- A domain or technical type belongs to the Component whose responsibility defines its meaning and invariants. Consumers import that owner's type when this preserves the intended dependency, or translate at their own boundary when they require a distinct owned meaning.
- An interface normally belongs to the consuming Component that requires the capability. The provider implements it without importing the consumer when structural typing permits. A provider-owned interface is justified only when the provider owns the contract semantics rather than merely offering extension convenience.
- A producer-owned immutable transfer type may cross a boundary when it represents the producer's established result. A consumer-owned command or acceptance input belongs to the consumer when its invariants define valid acceptance.
- Type aliases, embedding, anonymous structs, generic constraints, callback signatures, and serialization DTOs must not be used to conceal ownership or reverse a required dependency.
- Common constants, errors, logging helpers, clocks, identifiers, and test fixtures follow semantic or lifecycle ownership. Reuse alone is not a responsibility.

Generic `common`, `shared`, `utils`, `helpers`, `models`, or `types` packages are prohibited when their purpose is to bypass Component ownership or dependency rules. A package with such a name is not automatically invalid, but it must map to exactly one approved Component and satisfy the same cohesive responsibility, necessity, API, and dependency checks as every other package.

### 10.5 Import cycles and dependency inversion

The Go compiler rejects import cycles, but eliminating a cycle must preserve the approved Component architecture. For every actual or prospective cycle, identify the cross-Component contract and type ownership before changing code. Resolve it by one or more of:

- moving a contract or type to the Component that semantically owns it;
- defining a narrow consumer-owned interface and injecting an implementation;
- transferring an immutable owner-defined value and translating at the receiving boundary; or
- separating assembly into the approved composition Component.

Do not break a cycle by creating a generic shared package, duplicating authority, merging approved Components, inventing another Component definition, or moving contracts to a neutral package with no normative owner. If the approved boundaries cannot be realized without violating a model-backed invariant, record a concrete architecture conflict and return it for human review under section 9.

### 10.6 Automatically verifiable architecture rules

Every Go project with approved Components must keep executable architecture checks in its repository. The checks reference Component IDs from `components.yaml` and the reviewed package mapping; they are realization evidence, not another Component model. At minimum they fail when:

1. an in-scope Go package or Go source file has no Component owner or more than one owner;
2. a Go-based Component has zero or multiple primary packages without an active documented exception;
3. one package is mapped to multiple Components;
4. a production or test import crosses a Component boundary on a disallowed edge;
5. the effective package graph contains an import cycle or cannot be loaded for a supported build configuration;
6. a prohibited generic ownership-evading package appears;
7. a declared package mapping names a package absent from the effective Go inventory, or an unexpected package appears; or
8. an exception's executable constraint, scope, or expiry condition is violated.

Use exact import paths and Go-tool output rather than directory-name heuristics. The checks must cover external test packages and supported build configurations. Typed analysis must additionally enforce any reviewed restrictions on cross-Component symbol use, interface location, forbidden globals, or API allowlists that imports alone cannot express. Ordinary unit and integration tests verify contract behavior; architecture checks verify boundary shape. Both are required where applicable.

### 10.7 Exceptions

An exception is allowed only when the normal rule is impossible or materially harmful under concrete repository and model evidence. Record it in the package-realization report with:

- a stable exception ID;
- the exact rule waived;
- affected Component IDs, packages, files, and build configurations;
- the concrete reason the default cannot be met;
- confirmation that Component identity, authority, invariants, substitutability constraints, and artifact ownership remain unambiguous;
- the narrow allowed dependency or package shape;
- an executable check that prevents the exception from widening; and
- an owner, review trigger, and removal condition or an explicit reason it is permanent.

Convenience, current layout, migration effort by itself, an import cycle by itself, or broad reuse is not sufficient. Exceptions are reviewed implementation evidence and are not added to `components.yaml`. A changed or broadened exception requires renewed review.

### 10.8 Closure gate

Component Package Realization is **PASS** only when:

- section 9 realization reconciliation is PASS;
- every Go package and file has exactly one semantically verified Component owner;
- every Go-based Component has one primary package or a valid, bounded, tested exception;
- the allowed dependency graph and public APIs preserve approved responsibilities, authorities, contracts, and substitution requirements;
- all supported build configurations load without package or import-cycle errors;
- executable architecture checks and ordinary Go tests pass; and
- every exception is complete, current, and mechanically bounded.

Report **FAIL / INCOMPLETE** for any missing mapping, mixed package, unjustified dependency, unbounded exception, unsupported required build configuration, hidden shared state, or unresolved ownership or contract question. Passing compilation, `go test ./...`, Component YAML validation, or import-cycle absence alone is insufficient.
