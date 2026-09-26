# CPU Artifact Formats v1

- Status: Normative v1
- Companion specification: CPU Visual Language v1
- Source format: YAML

## 1. Purpose

Artifact Formats v1 defines the semantic source formats for Context, Pulse, UI, complementary Deployment, and their attached requirements. The YAML artifacts are authoritative. Rendering is derived from them using Visual Language v1.

The formats are intentionally small and artifact-specific. v1 does not introduce a generic metamodel, global registry, UUID scheme, presentation fields, or general cross-artifact relation mechanism. Requirement target addresses are the explicit, limited exception described in section 10.

## 2. Common rules

- Parsing is strict. Unknown fields are rejected.
- Duplicate mapping keys are invalid and must be detected before a parser overwrites them.
- IDs are machine-readable, stable within their natural artifact scope, and unique where the artifact requires identity.
- Names are human-readable display text and may change without changing identity.
- Presentation and renderer concerns do not belong in semantic YAML.
- Generated PDF diagrams and any optional preview files are derived artifacts and are not semantic sources.
- References must resolve within the artifact, except for the defined requirement target addresses.

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

`parties` contains directly communicating external parties. Each party has `id`, `type`, and `name`. Allowed v1 types are `person` and `external-system`.

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

Pulse describes possible causal event propagation using Behaviors, Pulses, and Flows. Trigger is a role in a Flow, not a separately declared semantic element.

```yaml
pulse:
  behaviors:
    - id: observe-vehicle-soc
      name: Observe vehicle SoC
    - id: plan-charging
      name: Plan charging
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

### 4.1 Behaviors

Each Behavior contains `id` and `name`. A Behavior is something the system does in reaction to a Pulse.

### 4.2 Pulses

Each Pulse contains `id`, `display`, and `name`. The ID is semantic identity. `display` is the short diagram identity, such as `01`, and is not used for references.

### 4.3 Flows

A Flow contains exactly one source form: either free-text `trigger` or Behavior reference `from`. It also contains Pulse reference `pulse` and Behavior reference `to`.

The invariant is `trigger` XOR `from`. A Flow with both is invalid; a Flow with neither is invalid.

### 4.4 Pulse validation

- Behavior IDs are unique.
- Pulse IDs are unique.
- Pulse display values are unique within the artifact.
- Every `pulse` reference resolves to a declared Pulse.
- Every `from` reference resolves to a declared Behavior.
- Every `to` reference resolves to a declared Behavior.
- Every Flow contains exactly one of `trigger` and `from`.
- `trigger` is non-empty domain text when present.
- Cycles and fan-out are valid and require no special syntax.
- No validation rule infers Pulse relations from data dependencies.

### 4.5 Pulse field reference

The top-level document contains exactly `pulse`. Its value contains exactly:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `behaviors` | list of Behavior mappings | yes | none | System reactions; may be empty. |
| `pulses` | list of Pulse mappings | yes | none | Named causal signals; may be empty. |
| `flows` | list of Flow mappings | yes | none | Causal propagation; may be empty. |

Behavior mapping:

| Field | Type | Required | Allowed/default |
| --- | --- | --- | --- |
| `id` | non-empty string ID | yes | Unique among Behaviors; no period. |
| `name` | non-empty string | yes | Human-readable verb phrase. |

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

### 4.6 Invalid Pulse examples

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

UI describes user-visible Views, reusable SubViews, their Information and Actions, and meaningful Navigation to Views.

A SubView is a reusable user-visible surface fragment that can be included by multiple Views. In v1, a SubView contains Navigation only. This supports shared navigation without duplicating the same destinations in every View.

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

Each View contains `id` and `name`. `includes`, `actions`, `information`, and View-local `navigation` are optional when the View has none of that kind.

`includes` is an ordered list of SubView IDs. Inclusion means that the SubView's user-visible capability is present in the containing View. It does not copy or redefine the SubView.

### 5.2 SubViews

Each SubView contains `id` and `name`, with optional `actions`, `information`, and `navigation`. SubView IDs are unique and distinct from View IDs.

A SubView is defined once and may be included by any number of Views. Actions and Information in a SubView have the same semantics as Actions and Information in a View. A SubView does not include another SubView in v1.

### 5.3 Actions

Each Action contains `id` and `name`. The name is a verb phrase expressing user intent, not a gesture or UI control.

### 5.4 Information

Each Information item contains `id` and `name`. The name is a noun or noun phrase representing a user-relevant concept independent of presentation.

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
- Every `includes` reference resolves to a declared SubView and is unique within its View.
- Every `navigation.to` reference in a View or SubView resolves to a declared View.
- View-local Navigation must not navigate to the containing View.
- SubView Navigation may reference any declared View, including a View that includes that SubView.
- Navigation entries contain only `to`.
- SubViews contain only `id`, `name`, `actions`, `information`, and `navigation`.
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

SubView mapping:

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `id` | non-empty string ID | yes | none | Unique SubView identity; no period. |
| `name` | non-empty string | yes | none | Human-readable SubView name. |
| `actions` | list of Action mappings | no | empty list | Reusable user intentions in declared order. |
| `information` | list of Information mappings | no | empty list | Reusable user-relevant concepts in declared order. |
| `navigation` | list of Navigation mappings | no | empty list | Shared destinations exposed wherever the SubView is included. |

Action and Information mappings contain exactly `id` and `name`.

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

`path`, `command`, and `interval` are non-empty strings. `port` is an integer from `1` through `65535`. `interval` has no duration-unit interpretation in v1 beyond being a normative non-empty runtime value.

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

## 7. Deliberately absent from v1

The following are intentionally not part of Artifact Formats v1:

- generic element or relation metamodels;
- areas, hierarchy, groups, tags, and metadata bags;
- layout coordinates or renderer style;
- UI widgets, gestures, responsive rules, colors, and typography;
- implementation architecture outside the complementary Deployment artifact;
- UUIDs, namespaces, or global ID registries;
- general cross-artifact relations;
- active or superseded lifecycle machinery;
- named Navigation relations.

## 8. Source layout and generation

```text
system/
  context.yaml
  pulse.yaml
  ui.yaml
  deployment.yaml
  requirements.yaml

context.yaml + requirements.yaml -> context.pdf
pulse.yaml + requirements.yaml -> pulse.pdf
ui.yaml + requirements.yaml -> ui.pdf
deployment.yaml + requirements.yaml -> deployment.pdf
```

The YAML files are the semantic sources. The four PDF diagrams are generated directly as native vector PDF. Rendering follows Visual Language v1 and must not add, remove, or reinterpret semantics.

## 9. v1 design principle

Keep each artifact small, explicit, artifact-specific, strict, and human-readable. Add structure only when an observed semantic need requires it.

## 10. Requirements format

Requirements are attached to identified model elements. `requirements.yaml` belongs to the same system model as the three core semantic artifacts and complementary Deployment artifact; all five files are reviewed together.

Requirements must not be embedded in model names or page graphics. PDF annotation markers, popup behavior, and placement are derived presentation defined by Visual Language v1.

### 10.1 Document shape

The document has exactly one top-level field, `requirements`. Its value is a mapping from target address to an ordered, non-empty list of non-empty requirement strings. An empty mapping is valid when no requirements are defined.

```yaml
requirements:
  context.flow.operating-data:
    - The system shall initiate retrieval of operating data.
  pulse.behavior.fetch-data:
    - One run shall comprise the complete retrieval.
  ui.action.diagnostics.acknowledge-error:
    - Acknowledgement shall be persistent.
  deployment.program.backend:
    - The backend shall run as an operating-system process.
```

Requirement list order is preserved. v1 adds no individual requirement IDs, metadata, status fields, presentation fields, or verification fields. A string's wording does not serve as an ID. List positions are not stable identities.

### 10.2 Target addresses

Words outside angle brackets are literal. IDs come from the corresponding semantic YAML; names and Pulse display numbers are never used as references.

- `context.system.<system-id>` targets the Context system.
- `context.party.<party-id>` targets a Context party.
- `context.flow.<flow-id>` targets a Context data flow.
- `pulse.behavior.<behavior-id>` targets a Behavior.
- `pulse.pulse.<pulse-id>` targets a Pulse.
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

Pulse Flows, free-text triggers, and View Navigation have no declared semantic IDs in v1 and are not directly addressable. Relevant requirements target an identified element, such as the triggering Pulse or affected View. This does not introduce identities for those constructs.

### 10.3 Attachment semantics

Each mapping entry attaches its requirements directly to exactly the addressed element. There is no implicit inheritance from a View to its contents, from a Behavior to its emitted Pulses, or between artifacts. A renderer must not infer or redistribute attachments.

One requirement string may be explicitly repeated at several targets if intended. Such repetition does not imply shared requirement identity. An element without an entry has no directly attached requirements; this says nothing about whether other requirements affect its behavior.

### 10.4 Requirements validation

- Reject unknown root fields, non-mapping requirement collections, invalid target syntax, duplicate keys, empty lists, and non-string or blank requirement values.
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
| `requirements` | mapping | yes | May be empty. Every key is one valid target address and every value is an ordered non-empty list. |

Each requirement value is a non-empty string. There are no requirement-object fields, IDs, severities, statuses, verification metadata, or implicit requirements. Duplicate YAML target keys are invalid before target resolution.

Target-address resolution is strict and case-sensitive. The number and order of address segments must exactly match one grammar listed in section 10.2. A syntactically plausible address of the wrong kind is invalid—for example, addressing an Information ID as an Action.

### 10.7 Invalid Requirements examples

```yaml
# Invalid: an attachment list must not be empty.
requirements:
  ui.view.main: []
```

```yaml
# Invalid: requirement values are strings, not metadata objects.
requirements:
  deployment.program.backend:
    - text: The backend shall run as an OS process.
      priority: high
```

```yaml
# Invalid: unknown target and wrong address shape.
requirements:
  deployment.port.web:
    - The Web UI shall be publicly reachable.
```
