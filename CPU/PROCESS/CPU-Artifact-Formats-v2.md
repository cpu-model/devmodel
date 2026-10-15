# CPU Artifact Formats v2

- Status: Normative v2
- Companion specification: CPU Visual Language v2
- Source format: YAML

## 1. Purpose

Artifact Formats v2 defines the semantic source formats for Context, Pulse, UI, complementary Deployment, their attached requirements, and the optional complementary Component and Presentation artifacts. The YAML artifacts are authoritative. Rendering is derived from the five-file base model using Visual Language v2.

The formats are intentionally small and artifact-specific. v2 does not introduce a generic metamodel, global registry, UUID scheme, or general cross-artifact relation mechanism. Presentation references into UI and requirement target addresses are the explicit, limited exceptions defined by this document.

## 2. Common rules

- Parsing is strict. Unknown fields are rejected.
- Duplicate mapping keys are invalid and must be detected before a parser overwrites them.
- IDs are machine-readable, stable within their natural artifact scope, and unique where the artifact requires identity.
- Names are human-readable display text and may change without changing identity.
- Renderer geometry does not belong in semantic YAML. UI Composition records functional grouping, occurrences, and order; optional Presentation records only its defined relative visual rules.
- Generated PDF diagrams and any optional preview files are derived artifacts and are not semantic sources.
- References must resolve within the artifact, except for the defined requirement target addresses.
- A configuration value with domain-functional meaning whose change can alter functional decisions, results, or domain behavior is modeled as Domain Information. Deployment may additionally describe its delivery mechanism. Purely technical configuration remains solely in Deployment.

## 3. Context format

Context describes one system, directly communicating people or external systems, domain data flows, data direction, and optional initiative.

```yaml
context:
  system:
    id: ev-charging
    name: EV Charging
  parties:
    - id: user
      type: person
      name: User
    - id: mercedes
      type: external-system
      name: Mercedes
    - id: electricity-price-service
      type: external-system
      name: Electricity Price Service
    - id: garo
      type: external-system
      name: GARO
  flows:
    - id: charging-preferences
      from: user
      to: ev-charging
      name: Charging preferences
      initiative: user
    - id: charging-information
      from: ev-charging
      to: user
      name: Charging information
    - id: vehicle-state
      from: mercedes
      to: ev-charging
      name: Vehicle state
      initiative: ev-charging
```

### 3.1 System

`system` is required and identifies exactly the system described by the artifact. It contains exactly `id` and `name`.

### 3.2 Parties

`parties` contains directly communicating external parties. Each party has `id`, `type`, and `name`. Allowed v2 types are `person` and `external-system`.

### 3.3 Flows

Each flow has `id`, `from`, `to`, and `name`. `from` to `to` always defines data direction.

`initiative` is optional and references the actual system or party ID that can initiate the interaction giving rise to the flow. It is deliberately not encoded as `from` or `to`, because initiative and data direction are independent semantics.

When `initiative` is omitted, initiative is unspecified. Opposite data directions carrying different domain information are modeled as separate flows.

### 3.4 Context validation

- Exactly one system is present.
- System ID and all party IDs are mutually unique.
- Every flow ID is unique.
- Every `from` and `to` reference resolves to the system or a party.
- `from` and `to` reference different endpoints.
- `initiative`, when present, resolves to either the flow's `from` endpoint or its `to` endpoint.
- Party type is exactly `person` or `external-system`.
- Flow names describe domain data, not protocol operations.

### 3.5 Context field reference

The top-level document contains exactly `context`. Its value contains exactly the following fields:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `system` | mapping | yes | none | The single described system. |
| `parties` | list of party mappings | yes | none | Directly communicating external parties; may be empty. |
| `flows` | list of flow mappings | yes | none | Directed domain-information flows; may be empty. |

System mapping:

| Field | Type | Required | Allowed/default |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique among the system and parties; no period. |
| `name` | non-empty string | yes | Human-readable display name. |

Party mapping:

| Field | Type | Required | Allowed/default |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique among the system and parties; no period. |
| `name` | non-empty string | yes | Human-readable display name. |
| `type` | string enum | yes | `person` or `external-system`. |

Flow mapping:

| Field | Type | Required | Allowed/default |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique among Context flows; no period. |
| `name` | non-empty string | yes | Domain-information noun phrase. |
| `from` | endpoint ID | yes | Resolves to the system or a party. |
| `to` | endpoint ID | yes | Resolves to a different endpoint. |
| `initiative` | endpoint ID | no | No default; when present, equals `from` or `to`. |

No other fields are allowed at any Context level.

### 3.6 Invalid Context examples

```yaml
# Invalid: protocol operation used as flow semantics and unresolved endpoint.
context:
  system: {id: app, name: App}
  parties: []
  flows:
    - {id: get-data, name: GET /data, from: browser, to: app}
```

```yaml
# Invalid: initiative is not one of this flow's endpoints.
context:
  system: {id: app, name: App}
  parties:
    - {id: user, name: User, type: person}
    - {id: scheduler, name: Scheduler, type: external-system}
  flows:
    - {id: input, name: User input, from: user, to: app, initiative: scheduler}
```

## 4. Pulse format

Pulse describes functional Behavior through two independent dimensions: causal event propagation through Pulses and Flows, and Domain Information participation through `information-in` and `information-out`. Trigger is a role in a Flow, not a separately declared semantic element. Information participation never implies Pulse causality, and Pulse causality never implies information participation.

```yaml
pulse:
  capabilities:
    - id: charging-planning
      name: Charging planning
  domain-information:
    - id: latest-valid-soc
      name: Latest valid SoC
    - id: operational-plan
      name: Operational plan
  behaviors:
    - id: observe-vehicle-soc
      name: Observe vehicle SoC
    - id: plan-charging
      name: Plan charging
      capability: charging-planning
      information-in: [latest-valid-soc]
      information-out: [operational-plan]
  pulses:
    - id: vehicle-observation
      display: "01"
      name: Vehicle observation
    - id: vehicle-state-updated
      display: "02"
      name: Vehicle state updated
  flows:
    - trigger: Startup
      pulse: vehicle-observation
      to: observe-vehicle-soc
    - from: observe-vehicle-soc
      pulse: vehicle-state-updated
      to: plan-charging
```

### 4.1 Capabilities

`capabilities` is optional. A Capability contains exactly `id` and `name` and is a flat functional review partition. When the field is present, every Behavior has exactly one valid `capability` reference. When absent, no Behavior may contain `capability`. Capability membership adds no ownership, causality, information flow, implementation boundary, or requirement inheritance. Capabilities are not hierarchical and are not requirement-addressable.

### 4.2 Domain Information

`domain-information` is optional. Each element contains exactly `id` and `name` and identifies domain-significant information with identity independent of technical representation. Every declaration is referenced by at least one Behavior. Domain Information introduces no schemas, fields, cardinality, persistence, ownership, source/destination, or information-to-information relation.

### 4.3 Behaviors

Each Behavior contains `id` and `name`, the conditional `capability` field described above, and optional ordered `information-in` and `information-out` lists. Each list contains unique references to declared Domain Information. The same reference may occur once in each list.

### 4.4 Pulses

Each Pulse contains `id`, `display`, and `name`. The ID is semantic identity. `display` is the short diagram identity, such as `01`, and is not used for references.

### 4.5 Flows

A Flow contains exactly one source form: either free-text `trigger` or Behavior reference `from`. It also contains Pulse reference `pulse` and Behavior reference `to`.

The invariant is `trigger` XOR `from`. A Flow with both is invalid; a Flow with neither is invalid.

### 4.6 Functional decomposition guidance

Capability grouping should express coherent functional responsibility rather than merely collect Behaviors that concern the same subject area.

- During modeling and review, state the functional question answered by each Capability. If that question requires materially different decisions joined by “and”, or spans distinct lifecycle stages that can change independently, reconsider the Capability boundary.
- Treat policy or decision, lifecycle or state transition, planning, execution, and physical control as distinct responsibility candidates when they can change independently or when one produces a domain-significant result consumed by the next. This is a decomposition signal, not a requirement to create those Capabilities in every system.
- When one responsibility produces a domain-significant result that another responsibility accepts, activates, supersedes, suspends, or terminates, model that intermediate result explicitly when doing so is necessary to preserve the functional distinction. Do not collapse distinct responsibilities around one mutable Domain Information identity merely for compactness.
- A Behavior should perform a domain responsibility rather than primarily inspect an event and redistribute consequences to unrelated Capabilities. A Behavior that mainly receives one Pulse and emits several Pulses toward different functional responsibilities is a decomposition warning. Prefer direct fan-out of the original domain event to independently responsible Behaviors when those reactions are independently meaningful.
- Prefer Pulses that name the domain-significant event that occurred over Pulses that prescribe the next Behavior's work. Names framed as something being needed, requested, or required should be reviewed for orchestration leakage and retained only when that need or request is itself a meaningful domain event.
- When a domain concept retains its identity while participating information changes, consider whether its lifecycle is a responsibility distinct from the Behavior that calculates or updates that information.
- Review Capability boundaries using representative domain disturbances and lifecycle transitions. For each event, identify independently which responsibilities must react. If one Capability or Behavior repeatedly dispatches consequences on behalf of several others, reconsider the decomposition.
- These tests refine functional semantics only. They do not make Capabilities implementation components, assign Domain Information ownership, or require a one-to-one mapping from Pulse structure to packages, processes, services, interfaces, or deployment units.

### 4.7 Pulse validation

- Behavior IDs are unique.
- Capability IDs are unique. If Capabilities are present every Behavior has exactly one resolving `capability`; otherwise `capability` is forbidden.
- Domain Information IDs are unique and every declaration participates in at least one Behavior.
- Every `information-in` and `information-out` value resolves to declared Domain Information and is unique within its list.
- Pulse IDs are unique.
- Pulse display values are unique within the artifact.
- Every `pulse` reference resolves to a declared Pulse.
- Every `from` reference resolves to a declared Behavior.
- Every `to` reference resolves to a declared Behavior.
- Every Flow contains exactly one of `trigger` and `from`.
- `trigger` is non-empty domain text when present.
- Cycles and fan-out are valid and require no special syntax.
- No validation rule infers Pulse relations from data dependencies.

### 4.8 Pulse field reference

The top-level document contains exactly `pulse`. Its value contains exactly:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `capabilities` | list of Capability mappings | no | absent | Optional functional review partition. |
| `domain-information` | list of Domain Information mappings | no | empty | Domain-significant information participating in Behaviors. |
| `behaviors` | list of Behavior mappings | yes | none | System reactions; may be empty. |
| `pulses` | list of Pulse mappings | yes | none | Named causal signals; may be empty. |
| `flows` | list of Flow mappings | yes | none | Causal propagation; may be empty. |

Behavior mapping:

| Field | Type | Required | Allowed/default |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique among Behaviors; no period. |
| `name` | non-empty string | yes | Human-readable verb phrase. |
| `capability` | Capability ID | conditional | Required exactly when `capabilities` is present. |
| `information-in` | list of Domain Information IDs | no | empty; no duplicates. |
| `information-out` | list of Domain Information IDs | no | empty; no duplicates. |

Capability and Domain Information mappings each contain exactly `id` and `name`; their IDs are unique within their respective collections and contain no period.

Pulse mapping:

| Field | Type | Required | Allowed/default |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique among Pulses; no period. |
| `display` | non-empty string | yes | Unique short diagram identity such as `"01"`. |
| `name` | non-empty string | yes | Human-readable event name. |

Flow mapping:

| Field | Type | Required | Allowed/default |
| --- | --- | --- | --- |
| `trigger` | non-empty string | exactly one source form | Free-text external or temporal trigger. |
| `from` | Behavior ID | exactly one source form | Emitting Behavior. |
| `pulse` | Pulse ID | yes | Resolves to a declared Pulse. |
| `to` | Behavior ID | yes | Resolves to a declared Behavior. |

`trigger` XOR `from` is mandatory. A Pulse Flow has no ID, name, or direct requirement address. No other fields are allowed.

### 4.9 Invalid Pulse examples

```yaml
# Invalid: both source forms are present.
flows:
  - trigger: Startup
    from: scheduler
    pulse: refresh
    to: fetch-data
```

```yaml
# Invalid: display identities are duplicated.
pulses:
  - {id: started, display: "01", name: Started}
  - {id: completed, display: "01", name: Completed}
```

## 5. UI format

UI describes user-visible Views, reusable SubViews, their Information and Actions, meaningful Navigation to Views, and optional functional Composition.

A SubView is a reusable user-visible surface fragment that can be included by multiple Views. It may contain Actions, Information, Navigation, and Composition, but it does not include another SubView. This supports shared user-visible capability without recursive reuse or duplication across Views.

```yaml
ui:
  subviews:
    - id: navigation
      name: Navigation
      navigation:
        - to: charging
        - to: planning
        - to: economics
  views:
    - id: charging
      name: Charging
      includes:
        - navigation
      information:
        - id: charging-status
          name: Charging status
    - id: planning
      name: Planning
      includes:
        - navigation
      actions:
        - id: select-target-soc
          name: Select target SoC
    - id: economics
      name: Economics
      includes:
        - navigation
      information:
        - id: charging-cost
          name: Charging cost
```

### 5.1 Views

Each View contains `id` and `name`. `includes`, `actions`, `information`, View-local `navigation`, and `composition` are optional when the View has none of that kind.

`includes` is an ordered list of SubView IDs. Inclusion means that the SubView's user-visible capability is present in the containing View. It does not copy or redefine the SubView.

### 5.2 SubViews

Each SubView contains `id` and `name`, with optional `actions`, `information`, `navigation`, and `composition`. SubView IDs are unique and distinct from View IDs.

A SubView is defined once and may be included by any number of Views. Actions and Information in a SubView have the same semantics as Actions and Information in a View. A SubView does not include another SubView in v2.

### 5.3 Actions

Each Action contains `id` and `name`. The name is a verb phrase expressing user intent, not a gesture or UI control.

### 5.4 Information

Each Information item contains `id` and `name`. The name is a noun or noun phrase representing a user-relevant concept independent of presentation. It may additionally contain ordered named `fields`, each with stable `id` and `name`, and `multiple: true` when the Information is a collection. Fields are presentation-addressable parts of the same Information; they are not a domain schema, data type, persistence model, algorithm, or Pulse Domain Information definition.

### 5.4A Composition

`composition` is an optional ordered list on a View or SubView. It records functional grouping, content occurrence, and total content order. Every group contains a locally unique stable `id` and a non-empty ordered `content` list.

A View Composition references that View's Actions, Information, and directly included SubViews. A SubView Composition references that SubView's Actions and Information. A string entry is the referenced content ID. Every available Action and included SubView occurs exactly once; every Information occurs at least once. Composition does not copy names or redefine content.

Information may occur more than once. Every repeated occurrence uses the mapping form `{id: <occurrence-id>, ref: <information-id>}` and every occurrence ID is unique within the owning View or SubView. The mapping form is forbidden for Actions and included SubViews. Occurrence IDs are Presentation reference targets only; they do not create new Information or a reusable component concept. Reuse between Views remains the responsibility of SubViews.

When Composition is absent, the existing declared Action, Information, include, and Navigation semantics are unchanged. When present, it is exhaustive so that no competing implicit order remains.

### 5.5 Navigation

Navigation has no ID and no name. A navigation entry contains only `to`, referencing a View.

```yaml
navigation:
  - to: economics
```

For View-local Navigation, the semantics are that the user can navigate from the containing View to the referenced View; self-navigation is rejected.

For Navigation declared by a SubView, the semantics are that the SubView provides navigation to the referenced View. A SubView may navigate to any declared View, including a View that includes that SubView. `includes` separately expresses that the referenced reusable SubView is present in the View.

Navigation describes user-significant navigation capability, not a menu, tab, button, gesture, or other navigation implementation.

### 5.6 UI validation

- View IDs are unique.
- SubView IDs are unique and do not collide with View IDs.
- Action IDs are unique within their containing View or SubView.
- Information IDs are unique within their containing View or SubView.
- Action and Information IDs do not collide within one View or SubView. When Composition exists, its Actions, Information, and included SubViews also have mutually distinct content IDs, so every scoped content reference remains unambiguous.
- Every `includes` reference resolves to a declared SubView and is unique within its View.
- Every `navigation.to` reference in a View or SubView resolves to a declared View.
- View-local Navigation must not navigate to the containing View.
- SubView Navigation may reference any declared View, including a View that includes that SubView.
- Navigation entries contain only `to`.
- SubViews contain only `id`, `name`, `actions`, `information`, `navigation`, and `composition`.
- Composition group and occurrence IDs are locally unique, all references resolve in the owning scope, repeated Information uses explicit occurrence IDs, and Composition covers all available content.
- Information field IDs are unique within their Information and `multiple`, when present, is boolean.
- Declared ordering of includes, Actions, Information, and Navigation is semantically preserved for deterministic rendering.

### 5.7 UI field reference

The top-level document contains exactly:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `subviews` | list of SubView mappings | no | empty list | Reusable user-visible surface fragments. |
| `views` | list of View mappings | yes | none | User-relevant Views; may be empty. |

View mapping:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `id` | non-empty string ID | yes | none | Unique View identity; no period. |
| `name` | non-empty string | yes | none | Human-readable View name. |
| `includes` | list of SubView IDs | no | empty list | Reusable SubViews present in this View, in declared order. |
| `actions` | list of Action mappings | no | empty list | User intentions in declared order. |
| `information` | list of Information mappings | no | empty list | User-relevant concepts in declared order. |
| `navigation` | list of Navigation mappings | no | empty list | Meaningful View-local paths. |
| `composition` | list of Composition group mappings | no | absent | Exhaustive functional grouping, occurrences, and order. |

SubView mapping:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `id` | non-empty string ID | yes | none | Unique SubView identity; no period. |
| `name` | non-empty string | yes | none | Human-readable SubView name. |
| `actions` | list of Action mappings | no | empty list | Reusable user intentions in declared order. |
| `information` | list of Information mappings | no | empty list | Reusable user-relevant concepts in declared order. |
| `navigation` | list of Navigation mappings | no | empty list | Shared destinations exposed wherever the SubView is included. |
| `composition` | list of Composition group mappings | no | absent | Exhaustive functional grouping, occurrences, and order. |

Action mappings contain exactly `id` and `name`.

Information mappings contain `id` and `name`, with optional `fields` and `multiple`. `fields` is an ordered list of mappings containing exactly `id` and `name`; field IDs are unique within the Information. `multiple` is boolean and defaults to `false` when absent.

Composition group mappings contain exactly `id` and `content`. `content` is a non-empty ordered list of content-ID strings or Information occurrence mappings containing exactly `id` and `ref`.

Navigation mapping contains exactly `to`, a View ID.

No other fields are allowed at any UI level.

### 5.8 Invalid UI examples

```yaml
# Invalid: unresolved included SubView.
views:
  - id: planning
    name: Planning
    includes: [missing-navigation]
```

```yaml
# Invalid: SubViews do not contain implementation controls or layout.
subviews:
  - id: navigation
    name: Navigation
    control: tabs
    navigation:
      - to: planning
```

## 5A. Optional Presentation format

`presentation.yaml` is an optional complementary normative artifact. Its absence leaves the five-file semantic base model complete and places no additional visual constraint on implementations. Its presence makes every declared rule normative; there is no separate preference tier.

UI owns functional content, Composition grouping, occurrences, and order. Presentation owns only relative visual structure, representations, time-zone notation, visual continuity, and declared visual-resource use. Presentation cannot declare Information, Actions, SubViews, content lists, or another content order. A visual resource never creates functional content. Unspecified Presentation detail remains free for implementation.

```yaml
presentation:
  timezone:
    source: site
  resources:
    - id: application-identity
      path: assets/application-identity.svg
  resource-uses:
    - resource: application-identity
      role: identity
      view: planning
    - resource: application-identity
      role: installation
  shared-layouts:
    - id: charging-workspace
      views: [planning, charging]
      regions:
        - ref: header
          direction: vertical
          continuity: true
        - ref: workspace
          direction: vertical
  subviews:
    - ref: charging-status
      layout:
        direction: horizontal
        wrap: true
      representations:
        - ref: vehicle-soc
          as: radial-progress
          emphasis: primary
        - ref: charging-target
          as: labeled-values
  views:
    - ref: planning
      representations:
        - ref: charging-options
          as: line-chart
        - ref: select-charging
          as: chart-selection
          on: charging-options
```

### 5A.1 Time-zone policy

`timezone` is required when `presentation.yaml` exists and contains `source`:

- `site` uses the deployment/site time zone supplied by the implementation context;
- `client` uses the current user's client time zone;
- `explicit` requires `zone`, a valid IANA time-zone name such as `Europe/Stockholm`.

`zone` is forbidden for `site` and `client`. All date-related Presentation notation uses the selected policy. A compact value such as `09:00+` means 09:00 on the following local calendar day in that selected time zone; `+` does not mean a duration or UTC offset. This notation rule adds no system-specific scheduling behavior.

### 5A.2 Shared layouts and regions

A Shared Layout contains exactly `id`, `views`, and `regions`. `id` is unique. `views` contains at least two unique View references. Every referenced View has Composition. `regions` is a non-empty list containing exactly the full Composition-group sequence of every referenced View; Presentation therefore cannot introduce competing order.

Each region contains `ref`, `direction`, and optional `wrap` and `continuity`. `ref` resolves to the same Composition-group ID in every listed View. `direction` is `horizontal` or `vertical`. `wrap` and `continuity` are booleans and default to `false` when absent.

`continuity: true` requires a non-empty, identical ordered sequence of included SubView references in that group in every listed View. It preserves a shared visible structure without copying the SubView or claiming that unrelated View-local Information and Actions are identical. Visual continuity does not require DOM persistence, retained runtime instances, or pixel-identical placement between Views. The same View/group pair cannot receive multiple Shared Layout definitions.

### 5A.3 View and SubView Presentation

`subviews` and `views` are optional lists. An entry's `ref` resolves to one UI SubView or View respectively and may occur only once. A SubView entry may contain `layout` and `representations`; a View entry may contain `representations`. `layout` contains required `direction` and optional boolean `wrap` using the vocabulary above. Layout never changes UI Composition order.

A representation contains required `ref` and `as`, with optional `emphasis` and `on`. `ref` resolves in the referenced View or SubView only. If Composition exists, it resolves a Composition occurrence ID; otherwise it resolves a direct Information or Action ID. `<information-or-occurrence-id>.<field-id>` addresses a declared Information field. A SubView's content is presented through its SubView definition, not by reaching through an including View. The representations list is a set of target rules in YAML declaration order for stable review; its order does not reorder UI content.

Initial Information representations are:

- `radial-progress`;
- `labeled-values`;
- `status-indicators`;
- `line-chart`;
- `bar-chart`;
- `table`.

The initial Action representation is `chart-selection`. It requires `on`, which resolves to an Information representation declared in the same entry. `on` is forbidden for other representations. Relative `emphasis` is `primary`, `secondary`, or `subdued`.

The same target cannot have two representations in one scope. Representing a whole Information and one of its fields in the same scope is conflicting and invalid; distinct fields may have distinct representations. Presentation representation names are normative semantic constraints on visual expression, not HTML elements, framework widgets, CSS classes, or implementation components.

### 5A.4 Visual resources

`resources` optionally declares normative visual files. Each resource contains exactly a stable `id` and a `path`. The path is a normalized relative path beginning with `assets/`, resolved from the concrete model's `CPU/` directory. It must identify an existing regular file whose resolved location remains inside `CPU/assets/`, including after symbolic-link resolution. Absolute paths, backslashes, empty path segments, `.` or `..` segments, missing files, directories, and paths escaping `assets/` are invalid. The file format and rendering technology are not prescribed by Presentation v1.

`resource-uses` optionally declares how a resource is used. Every declared resource has at least one use. Duplicate identical uses are invalid. Each use references one declared resource and has exactly one semantic role:

- `decorative` adds visual atmosphere without representing Information or creating content;
- `identity` supplies visual identity without creating content;
- `information-representation` graphically represents existing UI Information and requires `ref` plus exactly one owning `view` or `subview`;
- `installation` supplies a resource used to install or identify the deployed application outside a View and therefore forbids `view`, `subview`, and `ref`.

Every non-installation use references exactly one existing View or SubView. For `information-representation`, `ref` resolves with the same scoped rules as an Information representation: it may name existing Information, an Information occurrence, or an Information field. It must not resolve to an Action. `decorative` and `identity` are scoped to the referenced View or SubView and forbid `ref`; they do not become content occurrences and have no ordering semantics.

A resource declaration contains no name, label, caption, alternative text, action, destination, or arbitrary metadata. Such fields would introduce or obscure functional or technical semantics and are rejected. User-visible functional wording and accessibility requirements remain in UI or Requirements as applicable. Installation mechanics remain in Deployment or its attached Requirements; `installation` says only which visual resource has that use. Resource declarations and uses do not define Components, packages, widgets, HTML elements, CSS, pixel geometry, cropping, breakpoints, or responsive behavior.

### 5A.5 Strict validation and exclusions

Validation rejects unknown fields, duplicate YAML keys, duplicate definitions or IDs, unresolved or wrong-scope View/SubView/content/field/group/resource references, invalid resource paths or files, invalid resource-role shapes, invalid occurrences, incompatible continuous regions, competing group order, conflicting representations, invalid `on`, invalid enums, and invalid time-zone policies. All UI references resolve against the already validated UI model.

Presentation v1 contains no pixel geometry, absolute coordinates, CSS box model, mandatory palette, typography, animation, responsive breakpoint model, implementation framework, or new requirement-target grammar. It does not create a reusable component concept or a Presentation PDF. Existing UI rendering remains valid and is not required to render these application-presentation rules.

### 5A.6 Presentation field reference

The document contains exactly `presentation`. Its mapping contains:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `timezone` | Time-zone mapping | yes | No default. |
| `resources` | list of Resource mappings | no | Empty list. |
| `resource-uses` | list of Resource Use mappings | no | Empty list. |
| `shared-layouts` | list of Shared Layout mappings | no | Empty list. |
| `subviews` | list of SubView Presentation mappings | no | Empty list. |
| `views` | list of View Presentation mappings | no | Empty list. |

Time-zone mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `source` | string enum | yes | `site`, `client`, or `explicit`. |
| `zone` | non-empty IANA time-zone string | conditional | Required only for `explicit`; otherwise forbidden. |

Shared Layout mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `id` | non-empty ID | yes | Unique among Shared Layouts; no period. |
| `views` | list of View IDs | yes | At least two unique existing Views. |
| `regions` | list of Region mappings | yes | Non-empty and exactly follows each View's Composition-group sequence. |

Region mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `ref` | Composition-group ID | yes | Exists in every Shared Layout View. |
| `direction` | string enum | yes | `horizontal` or `vertical`. |
| `wrap` | boolean | no | `false`. |
| `continuity` | boolean | no | `false`; `true` requires compatible common SubView structure and order. |

SubView Presentation mapping contains `ref`, optional `layout`, and optional `representations`. View Presentation mapping contains `ref` and optional `representations`. `ref` is a unique existing SubView or View reference in its respective list.

Layout mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `direction` | string enum | yes | `horizontal` or `vertical`. |
| `wrap` | boolean | no | `false`. |

Representation mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `ref` | scoped content, occurrence, or field reference | yes | Resolves within the owning View or SubView. |
| `as` | representation enum | yes | One representation allowed for the resolved target kind. |
| `emphasis` | string enum | no | `primary`, `secondary`, or `subdued`; otherwise unspecified. |
| `on` | Information-representation reference | conditional | Required for `chart-selection`; forbidden otherwise. |

Resource mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `id` | non-empty ID | yes | Unique among resources; no period. |
| `path` | relative path string | yes | Begins with `assets/`, resolves to an existing regular file inside `CPU/assets/`. |

Resource Use mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `resource` | Resource ID | yes | Resolves to one declared resource. |
| `role` | string enum | yes | `decorative`, `identity`, `information-representation`, or `installation`. |
| `view` | View ID | conditional | Exactly one of `view` and `subview` for non-installation roles; forbidden for `installation`. |
| `subview` | SubView ID | conditional | Exactly one of `view` and `subview` for non-installation roles; forbidden for `installation`. |
| `ref` | scoped Information, occurrence, or field reference | conditional | Required for `information-representation`; forbidden for every other role. |

No other fields are allowed at any Presentation level.

## 6. Deployment format

Deployment describes one concrete intended deployment. Its commands, environment declarations, ports, mounts, health checks, restart policies, and resource constraints are normative implementation instructions. It is complementary to Context-Pulse-UI and does not add a fourth letter to the CPU name.

```yaml
deployment:
  environment:
    file: .env
    variables:
      - name: DATABASE_PASSWORD
        required: true
        secret: true
  hosts:
    - id: application-host
      name: Application host
      type: machine
      os: linux
      architecture: amd64
  programs:
    - id: application
      name: Application
      host: application-host
      type: os-process
      role: server-with-web-ui
      implementation:
        language: go
        platform: server-rendered-html
      command: ./application
      environment:
        file: .env
      ports:
        - id: web
          name: Web UI
          port: 8080
          application: http
          exposure: host
      health-check:
        type: http
        path: /health
      restart: on-failure
      resources:
        memory: 128MiB
  connections: []
```

### 6.1 Environment

`environment.file` defaults to `.env`. Variables contain `name` and optional `required`, scalar `default`, and `secret` fields. Secret values are never stored in the model. A variable marked `secret: true` must not define `default`.

Program and Compose-service environment declarations use the same shape and may override the deployment-level file or add variables for that runtime unit.

### 6.2 Hosts

Each host contains `id`, `name`, and `type`; optional `os` and `architecture` are normative constraints. Allowed host types are `machine`, `virtual-machine`, and `cloud-host`. A host represents an execution host, not a Compose container.

### 6.3 Programs and Compose services

Each program contains `id`, `name`, `host`, and `type`. Allowed types are `os-process`, `docker-compose`, `managed-service`, and `external-service`.

A `docker-compose` program contains a non-empty `services` list. Its services are the containers managed by that project. Other program types must not contain services. A Web UI may be a separate program/service or embedded by using role `server-with-web-ui`.

Optional program and service roles are `server`, `web-ui`, `server-with-web-ui`, `worker`, `database`, `proxy`, and `other`. A server's implementation language defaults to `go`. A `web-ui` or `server-with-web-ui` has no platform default: Codex selects a suitable platform when necessary and records it explicitly in `implementation.platform` for review.

Codex may select an unspecified port, but the chosen number must be written explicitly before validation and review. Every Web UI role declares at least one HTTP or HTTPS port.

### 6.4 Normative runtime instructions

Programs and services may declare:

- `command`: exact start command;
- `working-directory`: process working directory (programs only);
- `environment`: environment file and variable declarations;
- `ports`: listening ports and optional host publication;
- `volumes`: identified source-to-target mounts with optional `read-only`;
- `health-check`: `http`, `tcp`, or `command` check and its required parameters;
- `restart`: `no`, `on-failure`, `always`, or `unless-stopped`;
- `resources`: optional CPU and memory constraints.

A port contains `id`, `name`, and numeric `port`. `host-port` is the published host port when applicable. It is either a numeric port or a mapping `{variable: <environment-variable>, default: <port>}`. The mapping form makes host publication instance-configurable while keeping the service/container `port` fixed. `variable` names an environment variable declared in the applicable deployment, program, or service environment. `default` is optional and, when present, is a valid numeric port. At runtime the environment-variable value selects the published host port; when it is absent, `default` is used. A variable-backed `host-port` without `default` therefore requires that variable to be supplied. `transport` defaults to `tcp`; `application` records an application protocol such as `http`, `https`, or `postgres`; `exposure` defaults to `internal` and is `internal`, `host`, or `public`.

### 6.5 Connections

Each directed connection contains `id`, `name`, `from`, and `to`, with optional `transport` and `application`. An endpoint is a program ID, `<program-id>.<service-id>`, `<program-id>.<port-id>`, or `<program-id>.<service-id>.<port-id>`. Both endpoints must resolve to visible deployment elements. Infrastructure and external services appear only when explicitly declared as hosts/programs and referenced by a connection.

### 6.6 Deployment validation

- IDs are unique in their natural host, program, service, port, or connection scope and contain no period.
- Every program resolves to one declared host.
- Every connection endpoint resolves and its ends differ.
- Web UI platforms and Web UI ports are explicit.
- Server language resolves to explicit `implementation.language` or the `go` default.
- Compose projects have services; non-Compose programs do not.
- Secret values, invalid ports, unknown fields, invalid enum values, and structurally incomplete normative instructions are rejected.

### 6.7 Deployment field reference

The top-level document contains exactly `deployment`. Its value contains:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `environment` | Environment mapping | no | `{file: .env}` | Deployment-wide environment source and declarations. |
| `hosts` | list of Host mappings | yes | none | Concrete execution hosts; may be empty. |
| `programs` | list of Program mappings | yes | none | Deployable runtime units; may be empty. |
| `connections` | list of Connection mappings | yes | none | Directed network connections; may be empty. |

Environment mapping, used at deployment, program, and service levels:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `file` | non-empty string | no | `.env` | Environment file path relative to the applicable runtime context. |
| `variables` | list of Variable mappings | no | empty list | Declared environment variables. |

Variable mapping:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `name` | non-empty string | yes | none | Unique variable name within this Environment mapping. |
| `required` | boolean | no | `false` | Whether deployment must supply a value. |
| `default` | string, number, or boolean | no | none | Non-secret fallback value. |
| `secret` | boolean | no | `false` | Whether the supplied value is secret. |

`secret: true` and `default` are mutually exclusive. A model never contains a secret value.

Host-port mapping, when a port's `host-port` is variable-backed:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `variable` | non-empty string | yes | none | Name of an environment variable declared in the applicable deployment, program, or service environment. |
| `default` | integer port | no | none | Published host port used when the variable is not supplied. |

No other fields are allowed in a Host-port mapping.

Host mapping:

| Field | Type | Required | Allowed/default |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Globally unique Host ID; no period. |
| `name` | non-empty string | yes | Human-readable host name. |
| `type` | string enum | yes | `machine`, `virtual-machine`, or `cloud-host`. |
| `os` | non-empty string | no | No default; normative when present. |
| `architecture` | non-empty string | no | No default; normative when present. |

Program mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Globally unique Program ID; no period. |
| `name` | non-empty string | yes | none |
| `host` | Host ID | yes | Resolves to one declared Host. |
| `type` | string enum | yes | `os-process`, `docker-compose`, `managed-service`, or `external-service`. |
| `role` | string enum | no | `server`, `web-ui`, `server-with-web-ui`, `worker`, `database`, `proxy`, or `other`. |
| `implementation` | Implementation mapping | conditionally | Required to provide `platform` for Web UI roles. |
| `command` | non-empty string | no | Exact normative start command. |
| `working-directory` | non-empty string | no | Normative process working directory. |
| `environment` | Environment mapping | no | Deployment-level declarations apply unless overridden by variable name; a local `file` replaces the deployment-level file and otherwise defaults to `.env`. |
| `ports` | list of Port mappings | no | empty list; Web UI roles require an HTTP or HTTPS port. |
| `volumes` | list of Volume mappings | no | empty list |
| `health-check` | Health-check mapping | no | none |
| `restart` | string enum | no | `no`, `on-failure`, `always`, or `unless-stopped`; no implicit default. |
| `resources` | Resources mapping | no | none |
| `services` | list of Service mappings | conditional | Non-empty for `docker-compose`; forbidden for other types. |

Compose Service mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique inside the containing Compose project; no period. |
| `name` | non-empty string | yes | none |
| `role` | string enum | no | Same values as Program `role`. |
| `implementation` | Implementation mapping | conditionally | Required to provide `platform` for Web UI roles. |
| `command` | non-empty string | no | Exact container start command. |
| `environment` | Environment mapping | no | Same shape as above. |
| `ports` | list of Port mappings | no | empty list; Web UI roles require an HTTP or HTTPS port. |
| `volumes` | list of Volume mappings | no | empty list |
| `health-check` | Health-check mapping | no | none |
| `restart` | string enum | no | Same values as Program `restart`. |
| `resources` | Resources mapping | no | none |

Services do not declare `host`, `type`, `working-directory`, or nested `services`; those concerns belong to their Compose project.

Implementation mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `language` | non-empty string | no | Defaults to `go` for `server` and `server-with-web-ui`; otherwise unspecified. |
| `platform` | non-empty string | conditional | Required for `web-ui` and `server-with-web-ui`; no default. |

Port mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique inside its Program or Service; no period. |
| `name` | non-empty string | yes | none |
| `port` | integer | yes | `1` through `65535`; process or container listening port. |
| `host-port` | integer or Host-port mapping | no | Fixed `1` through `65535`, or variable-backed publication as defined below. |
| `transport` | string enum | no | `tcp` by default; alternatively `udp`. |
| `application` | non-empty string | no | Application protocol such as `http`, `https`, or `postgres`. |
| `exposure` | string enum | no | `internal` by default; alternatively `host` or `public`. |

Host-port mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `variable` | non-empty string | yes | Must be declared in the applicable deployment, program, or service Environment mapping. |
| `default` | integer | no | `1` through `65535`; used when the variable is absent. |

Volume mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique inside its Program or Service; no period. |
| `source` | non-empty string | yes | Host path, named volume, or other concrete source. |
| `target` | non-empty string | yes | Runtime mount target. |
| `read-only` | boolean | no | `false`. |

Health-check mapping:

| `type` | Required fields | Optional fields | Forbidden type-specific fields |
| --- | --- | --- | --- |
| `http` | `type`, `path` | `port`, `interval` | `command` |
| `tcp` | `type`, `port` | `interval` | `path`, `command` |
| `command` | `type`, `command` | `interval` | `path`, `port` |

`path`, `command`, and `interval` are non-empty strings. `port` is an integer from `1` through `65535`. `interval` has no duration-unit interpretation in v2 beyond being a normative non-empty runtime value.

Resources mapping:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `cpu` | non-empty string or positive number | at least one resource field | Normative CPU constraint. |
| `memory` | non-empty string or positive number | at least one resource field | Normative memory constraint. |

Connection mapping:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique among Connections; no period. |
| `name` | non-empty string | yes | none |
| `from` | endpoint reference | yes | Resolves to a visible Program, Service, or Port. |
| `to` | endpoint reference | yes | Resolves to a different visible endpoint. |
| `transport` | string enum | no | `tcp` or `udp`; otherwise unspecified. |
| `application` | non-empty string | no | Application protocol; otherwise unspecified. |

Endpoint grammar is exactly one of:

```text
<program-id>
<program-id>.<port-id>
<compose-program-id>.<service-id>
<compose-program-id>.<service-id>.<port-id>
```

No other fields are allowed at any Deployment level.

### 6.8 Complete Docker Compose example

```yaml
deployment:
  environment:
    file: .env
    variables:
      - name: DATABASE_PASSWORD
        required: true
        secret: true
  hosts:
    - id: production-host
      name: Production host
      type: virtual-machine
      os: linux
      architecture: amd64
  programs:
    - id: application-stack
      name: Application stack
      host: production-host
      type: docker-compose
      services:
        - id: web
          name: Web
          role: server-with-web-ui
          implementation:
            language: go
            platform: server-rendered-html
          command: ./application
          ports:
            - id: http
              name: Web UI
              port: 8080
              host-port: 443
              transport: tcp
              application: https
              exposure: public
          health-check:
            type: http
            path: /health
            port: 8080
            interval: 30s
          restart: unless-stopped
          resources:
            cpu: 1
            memory: 256MiB
        - id: database
          name: Database
          role: database
          implementation:
            platform: postgres
          ports:
            - id: postgres
              name: PostgreSQL
              port: 5432
              application: postgres
          volumes:
            - id: data
              source: database-data
              target: /var/lib/postgresql/data
          health-check:
            type: command
            command: pg_isready
  connections:
    - id: web-to-database
      name: Store application data
      from: application-stack.web
      to: application-stack.database.postgres
      transport: tcp
      application: postgres
```

### 6.9 Invalid Deployment examples

```yaml
# Invalid: Web UI platform and explicit HTTP/HTTPS port are missing.
- id: frontend
  name: Frontend
  host: application-host
  type: os-process
  role: web-ui
```

```yaml
# Invalid: secret values must not be stored as defaults.
variables:
  - name: DATABASE_PASSWORD
    secret: true
    default: hunter2
```

```yaml
# Invalid: services are allowed only in a docker-compose program.
- id: server
  name: Server
  host: application-host
  type: os-process
  services:
    - {id: nested, name: Nested}
```

```yaml
# Invalid: the endpoint does not resolve.
- id: missing-database
  name: Database connection
  from: application
  to: data-stack.missing.postgres
```

## 7. Deliberately absent from v2

The following are intentionally not part of Artifact Formats v2:

- generic element or relation metamodels;
- areas, hierarchy, groups, tags, and metadata bags;
- layout coordinates or renderer style;
- UI widgets, gestures, responsive rules, colors, and typography;
- implementation architecture outside the complementary Deployment and optional Component artifacts;
- UUIDs, namespaces, or global ID registries;
- general cross-artifact relations;
- active or superseded lifecycle machinery;
- named Navigation relations.

## 8. Source layout and generation

```text
system/
  assets/  # optional files declared by presentation.yaml
  context.yaml
  pulse.yaml
  ui.yaml
  deployment.yaml
  requirements.yaml
  components.yaml  # optional
  presentation.yaml  # optional

context.yaml + requirements.yaml -> context.pdf
pulse.yaml + requirements.yaml -> pulse.pdf
ui.yaml + requirements.yaml -> ui.pdf
deployment.yaml + requirements.yaml -> deployment.pdf
presentation.yaml + declared assets -> validated normative application-presentation constraints; no additional PDF
```

The YAML files are the semantic sources. The four PDF diagrams are generated directly as native vector PDF. Rendering follows Visual Language v2 and must not add, remove, or reinterpret semantics.

## 9. v2 design principle

Keep each artifact small, explicit, artifact-specific, strict, and human-readable. Add structure only when an observed semantic need requires it.

## 10. Requirements format

Requirements are attached to identified model elements. `requirements.yaml` belongs to the same system model as the three core semantic artifacts and complementary Deployment artifact; all five files are reviewed together.

Requirements must not be embedded in model names or page graphics. PDF annotation markers, popup behavior, and placement are derived presentation defined by Visual Language v2.

### 10.1 Document shape

The document has exactly one top-level field, `requirements`. Its value is a mapping from target address to an ordered, non-empty list of requirement objects. Every object contains exactly `id` and `text`, both non-empty strings. An empty mapping is valid when no requirements are defined.

```yaml
requirements:
  context.flow.operating-data:
    - id: initiate-operating-data-retrieval
      text: The system shall initiate retrieval of operating data.
  pulse.behavior.fetch-data:
    - id: complete-retrieval-run
      text: One run shall comprise the complete retrieval.
  ui.action.diagnostics.acknowledge-error:
    - id: persist-acknowledgement
      text: Acknowledgement shall be persistent.
  deployment.program.backend:
    - id: run-backend-as-os-process
      text: The backend shall run as an operating-system process.
```

Requirement list order is preserved. Requirement IDs are human-readable semantic keys, globally unique within `requirements.yaml`, and contain no period. They are not UUIDs, sequence numbers, or target encodings. Identity remains stable across editorial rewording or relocation when normative meaning is unchanged; a normative meaning change creates a new ID. No other metadata fields exist.

### 10.2 Target addresses

Words outside angle brackets are literal. IDs come from the corresponding semantic YAML; names and Pulse display numbers are never used as references.

- `context.system.<system-id>` targets the Context system.
- `context.party.<party-id>` targets a Context party.
- `context.flow.<flow-id>` targets a Context data flow.
- `pulse.behavior.<behavior-id>` targets a Behavior.
- `pulse.pulse.<pulse-id>` targets a Pulse.
- `pulse.domain-information.<domain-information-id>` targets Domain Information.
- `ui.view.<view-id>` targets a View.
- `ui.action.<view-id>.<action-id>` targets an Action in that View.
- `ui.info.<view-id>.<information-id>` targets Information in that View.
- `ui.subview.<subview-id>` targets a SubView.
- `ui.subview-action.<subview-id>.<action-id>` targets an Action in that SubView.
- `ui.subview-info.<subview-id>.<information-id>` targets Information in that SubView.
- `deployment.host.<host-id>` targets a host.
- `deployment.program.<program-id>` targets a program.
- `deployment.program.<program-id>.port.<port-id>` targets a program port.
- `deployment.service.<program-id>.<service-id>` targets a Compose service.
- `deployment.service.<program-id>.<service-id>.port.<port-id>` targets a Compose-service port.
- `deployment.connection.<connection-id>` targets a network connection.

Addresses are case-sensitive. An addressable ID must not contain a period, which is the address separator. Validation reports an unaddressable ID rather than silently renaming it.

Capabilities, Pulse Flows, free-text triggers, graphical `FROM`/`TO` Capability references, and View Navigation are not directly addressable.

### 10.3 Attachment semantics

Each mapping entry attaches its requirements directly to exactly the addressed element. There is no implicit inheritance from a View to its contents, from a Behavior to its emitted Pulses, or between artifacts. A renderer must not infer or redistribute attachments.

Requirement identity is global even though attachment is direct. An element without an entry has no directly attached requirements; this says nothing about whether other requirements affect its behavior. A requirement expresses one independently assessable normative rule.

### 10.4 Requirements validation

- Reject unknown root fields, non-mapping requirement collections, invalid target syntax, duplicate keys, empty lists, string-only entries, objects with fields other than exactly `id` and `text`, blank IDs or text, IDs containing periods, and duplicate requirement IDs anywhere in the file.
- Resolve every target against the corresponding Context, Pulse, UI, or Deployment artifact. Reject unknown IDs and wrong element kinds. Action and Information IDs resolve only within their addressed View or SubView; Service and Port IDs resolve only within their addressed Deployment parents.
- Apply all existing model validation rules as well as the addressing restriction. Never repair invalid references by matching display names.
- Reject orphaned targets after deleting or renaming an element. Update the model and its requirements together; do not silently discard requirements.
- Missing entries for otherwise valid elements are allowed. An empty `requirements` mapping is allowed.

### 10.5 Review and generation

The reviewed model comprises the three core semantic artifacts, complementary Deployment artifact, and requirement attachment file. Diagram review provides access to the exact requirement strings attached to the selected element. Approval of diagrams alone must not be assumed to approve requirements omitted from review.

Generation reads all five sources. PDF annotations are derived solely from resolved, non-empty attachments. Generated files must not add, omit, summarize, or reinterpret the authoritative requirement strings shown during review.

### 10.6 Requirements field reference

The top-level document contains exactly one field:

| Field | Type | Required | Default/constraint |
| --- | --- | --- | --- |
| `requirements` | mapping | yes | May be empty. Every key is one valid target address and every value is an ordered non-empty list of requirement objects. |

Each requirement object contains exactly `id` and `text`. There are no severities, statuses, verification metadata, presentation fields, or implicit requirements. Duplicate YAML target keys are invalid before target resolution.

Target-address resolution is strict and case-sensitive. The number and order of address segments must exactly match one grammar listed in section 10.2. A syntactically plausible address of the wrong kind is invalid—for example, addressing an Information ID as an Action.

### 10.7 Invalid Requirements examples

```yaml
# Invalid: an attachment list must not be empty.
requirements:
  ui.view.main: []
```

```yaml
# Invalid: a requirement object has an unknown field.
requirements:
  deployment.program.backend:
    - id: run-backend
      text: The backend shall run as an OS process.
      priority: high
```

```yaml
# Invalid: unknown target and wrong address shape.
requirements:
  deployment.port.web:
    - id: expose-web-ui
      text: The Web UI shall be publicly reachable.
```

## 11. Optional Component architecture format

`components.yaml` is an optional complementary Component architecture artifact governed by CPU Component Discovery. A Component is a cohesive, necessary, bounded system part with one identifiable responsibility and the normative runtime implementation boundary that realizes it. A responsibility is functional or infrastructural; these are categories within one Component concept, not separate logical, runtime, functional, or technical Component types. The artifact does not extend or alter Context, Pulse, UI, Deployment, or Requirements semantics. If absent, the five-file semantic base model remains complete and valid and CPU makes no normative Component-boundary claim. If present, its boundaries, assignments, responsibility categories, evidence, and reconciliation prerequisites are normative.

The document has exactly one top-level field, `components`:

```yaml
components:
  components:
    - id: observation-integration
      name: Observation Integration
      responsibility: Establish the valid external observation used by result processing.
      behaviors: []
    - id: result-authority
      name: Result Authority
      responsibility: >
        Accept submitted work, own the processed result and preserve its
        meaning through presentation.
      behaviors:
        - process-input
        - present-result
      reconciliation:
        requires:
          - observation-integration
    - id: runtime-composition
      name: Runtime Composition
      responsibility: Compose the required process while preserving functional authority in its owning Components.
      kind: infrastructure
      behaviors: []
      requirement-evidence:
        - combine-server-and-web-ui
  domain-information:
    - id: submitted-input
      disposition: external-input
    - id: processed-result
      authority: result-authority
```

### 11.1 Component entries

The `components` list is non-empty when the artifact exists; omit `components.yaml` when no Component is normative. Every Component contains exactly `id`, `name`, `responsibility`, and `behaviors`, with optional `kind`, `requirement-evidence`, and `reconciliation`.

- `id` is a stable, non-empty, unique machine-readable ID and contains no period.
- `name` and `responsibility` are non-empty strings.
- `kind`, when present, is exactly `functional` or `infrastructure`. Absence means `functional`, preserving existing Component models. The value classifies the responsibility, not the Component concept, runtime tier, package type, process type, or authority level.
- `behaviors` is a list of Pulse Behavior IDs. Every Pulse Behavior occurs exactly once across all Components.
- `requirement-evidence`, when present, is a non-duplicated list of existing requirement IDs. It provides structural grounding and traceability only when requirement evidence helps establish the Component's existence or boundary. It neither copies requirement text nor attaches, inherits, relocates, or changes a requirement. It does not imply that only the referenced requirements apply to the Component. An infrastructure Component must cite at least one requirement attached to a `deployment.*` target, establishing its normative realization basis without claiming a Pulse Behavior or Domain Information item. Additional requirement evidence may refine its technical invariant, lifecycle, or contracts.
- `reconciliation`, when present, contains exactly `requires`. `requires` is a list of unique Component IDs and defines the Component's reconciliation prerequisites. Absence of `reconciliation` means that the Component has no Component reconciliation prerequisites.

A Component may have an empty `behaviors` list only when at least one Domain Information item names it as authority, it has non-empty `requirement-evidence`, or it participates in the reconciliation graph by requiring another Component or being required by another Component. Derived Domain Information alone does not ground a behaviorless Component. Every infrastructure Component has Deployment requirement evidence even if it also owns Behaviors, authority, or reconciliation participation. This structural check does not prove necessity; every listed entry has passed the appropriate functional or infrastructure Component Necessity Test and is one normative runtime implementation boundary for one cohesive responsibility.

The `requires` graph is always a DAG. Unknown references, duplicates, self-dependencies, and direct or indirect cycles are invalid. No topological order is stored. `requires` means that whenever this Component needs reconciliation, every listed Component must first be `RECONCILED`. It is stronger than ordinary information dependency; reading information established by another Component does not imply `requires`.

Reconciliation uses the architecture-mechanical states `UNRECONCILED`, `RECONCILING`, and `RECONCILED`. These states are not Domain Information and are not stored in `components.yaml`. Startup, relevant reconfiguration, migration, and recovery use the same invalidation and reconciliation mechanism. The Component owns how it restores valid runtime state and invariants; the system/runtime owns dependency ordering and transitive invalidation.

### 11.2 Domain Information disposition

`domain-information` contains exactly one entry for every Pulse Domain Information ID. The outcomes are mutually exclusive. Each entry contains `id` and exactly one of:

- `authority: <component-id>` — the named Component has authority to accept or establish the relevant mutable state transitions and protect their invariants; or
- `disposition: external-input` — information whose relevant truth is established outside the system and observed as input or fact; an internally accepted, normalized, or mutable representation with its own transitions instead requires `authority`;
- `disposition: transfer` — an immutable result transferred across a responsibility contract without a continuing mutable lifecycle; acceptance may establish separate authoritative state; or
- `disposition: derived` — information reproducible from other information and without independently authoritative transitions. It may be materialized or cached. This classifies authority status only and does not exclude the deriving calculation, estimation, or projection responsibility from Component architecture. Persistent derived information with independent update, validity, finalization, invalidation, consistency, or reconciliation rules requires authority analysis instead.

Reader, producer, adapter, and persistence mechanism are not implicit owners. The disposition is architectural classification only; it does not create information, alter Pulse causality, or replace the functional definition in Pulse.

If discovery cannot determine one outcome from the semantic base model, it records UNRESOLVED and does not create `components.yaml` until review resolves the classification. The validator checks the declared outcome structurally and never infers one.

### 11.3 Semantic change impact review

When any of the five semantic base-model files changes, review the effect on the approved Component responsibilities, Behavior assignments, Domain Information dispositions, and reconciliation prerequisites. Update `components.yaml` only when the architecture is affected. Git history records the reviewed changes; no digest is stored in the Component artifact.

### 11.4 Strict structural validation

When `components.yaml` exists, validation rejects unknown fields, duplicate YAML keys, invalid or duplicate Component IDs, blank names or responsibilities, invalid responsibility kinds, infrastructure Components without Deployment requirement evidence, unknown or duplicate Behavior assignments, incomplete Behavior coverage, unknown or duplicate Domain Information mappings, incomplete Domain Information coverage, entries that have both or neither `authority` and `disposition`, unknown Component authorities, invalid dispositions, unknown or duplicate requirement evidence, invalid reconciliation shapes, unknown or duplicate prerequisites, self-dependencies, reconciliation cycles, and ungrounded behaviorless Components.

Validation does not decide whether a responsibility is cohesive, cited Deployment evidence actually necessitates a separate infrastructure boundary, an authority or disposition is semantically correct, reconciliation is semantically necessary, the Necessity Test was performed correctly, Components should be merged or split, contracts preserve functional authority, or invariant isolation is sound. Those are discovery and human-review decisions.

The artifact contains no Pulse interactions, readers, requirement text, source-artifact lists, packages, directories, processes, transports, implementation technology, or Deployment mappings. File-to-Component ownership and Go package realization are maintained through realization reconciliation and Component Package Realization, not stored here. Their reports and executable architecture checks reference Component IDs from this artifact without redefining Components. The artifact has no generated Component diagram in Visual Language v2.
