# CPU Visual Language v1

- Status: Normative v1
- Renderer baseline: D2 0.9.0
- Layout engine: ELK
- Primary diagram output: SVG
- Primary permanent review output: PDF derived from the finished SVG
- Raster output: PNG derived from SVG

## 1. Purpose

Visual Language v1 defines the notation used to render Context, Pulse, UI, and the complementary Deployment artifact.

The semantic artifacts are authoritative. The visual language defines notation. D2 is only the renderer.

Rendering must be deterministic and reproducible. Semantics must never be weakened or changed to accommodate renderer limitations.

```text
semantic YAML
    |
    v
generator
    |
    v
D2
    |
    v
D2 0.9.0 + ELK
    |
    v
SVG
    |
    v
minimal deterministic SVG decoration
    |
    v
final SVG / PNG / interactive review HTML
```

The same semantic input, Visual Language version, D2 version, and layout engine should produce the same diagram.

## 2. General principles

The symbol expresses what something is. The edge expresses the relationship. The text expresses the system-specific meaning.

Color is secondary. The notation must remain understandable in black and white.

Stable semantic IDs belong to source artifacts. Display text may change without changing identity.

Generated D2 and SVG are derived artifacts; semantic YAML is the source.

### 2.1 Diagram edge clearance

Every rendered diagram has a consistent outer margin between its visible content and the exported viewport. Symbols, labels, legends, requirement annotations, and connector geometry must not sit directly against or be clipped by a diagram edge.

## 3. Context

### 3.1 Purpose

Context describes:

- the system being described;
- people and external systems that communicate directly with it;
- important domain data flows across the system boundary;
- which party can initiate the interaction giving rise to a flow.

Context is not a detailed data-flow diagram, sequence diagram, integration architecture, implementation diagram, or protocol diagram.

### 3.2 Elements

- **System:** exactly the system being described; normally one; rendered as a visually dominant rectangle with a stronger border.
- **Person:** a human role directly interacting with the system; rendered with a person symbol.
- **External system:** an external technical system or service directly communicating with the system; rendered as a rounded rectangle.

Internal implementation elements such as databases, containers, schedulers, internal HTTP servers, and internal services are excluded.

### 3.3 Data flows

A Context relation represents a domain data flow. Its name is a noun or noun phrase, for example Vehicle state, Electricity prices, Charging command, or Energy reading.

Protocol and implementation terms such as GET, POST, request, or response should not be used as the domain flow name.

If opposite directions carry different information, they are represented as separate flows.

### 3.4 Data direction

An arrowhead indicates only the direction in which the named data flows. The arrowhead has no initiative semantics.

### 3.5 Initiative

An empty circle at an endpoint indicates that the party at that end can initiate the interaction giving rise to the data flow.

No initiative circle means initiative is unspecified. It does not mean nobody initiates.

Initiative and data direction are orthogonal semantic properties. The initiative circle:

- is centered exactly on the actual geometric connector path;
- is placed near the initiating endpoint;
- remains a separate symbol from the arrowhead;
- never visually merges with an arrowhead.

When initiative and an arrowhead occur at the same endpoint, a small but clearly visible distance separates them along the connector path. The marks must not be perceived as a combined glyph.

### 3.6 Relation labels

A data-flow label is an annotation, not part of the connector. The label has clear visual separation from connector geometry.

Its visual bounding box has minimum clearance from all relevant connector segments. A connector must not pass through or immediately adjacent to visible text.

Label placement is based on actual rendered geometry rather than a fixed vertical offset.

### 3.7 Connector spacing

Parallel or nearby Context relations have enough separation for their connector paths, labels, initiative symbols, and arrowheads.

Layout spacing should be solved during layout or generation where possible. Postprocessing must not compensate for fundamentally overcrowded relation routing by arbitrarily moving labels.

### 3.8 Rendering status

- Context nodes: Native D2.
- Context connector routing: Native D2/ELK.
- Initiative symbol: Adapted by minimal deterministic SVG decoration.
- Label clearance: Adapted where necessary using rendered geometry.

The verified Context rendering establishes that initiative, data direction, and data-flow text are three visually distinct aspects.

## 4. Pulse

### 4.1 Purpose

Pulse describes how event chains start and how they can propagate through the system. It describes possible causal event flows.

Pulse does not describe implementation, execution logic, data dependencies, or exact runtime traces. Using, reading, or depending on data does not by itself create Pulse semantics.

### 4.2 Semantic elements

Pulse has three fundamental semantic concepts: Behavior, Pulse, and Flow.

Trigger is a role played by an external or starting cause. It is not a separate permanent semantic element.

- **Behavior:** something the system does in reaction to a Pulse; rendered as a rounded rectangle.
- **Pulse:** an identified event that can drive a Behavior; has a stable semantic ID and may have a short display identity such as `01`.
- **Flow:** introduces or emits a Pulse and directs it to a Behavior.

A Behavior may emit zero, one, or several Pulses. An outgoing Pulse means "can emit", not "always emits". Conditions remain internal to Behavior.

Multiple incoming Pulses have independent or OR semantics. The same Pulse may fan out to several Behaviors. Cycles are allowed. No special gateway, end, or loop notation is required.

### 4.3 Trigger role and notation

A trigger is a free domain description of a cause that introduces a Pulse into the event chain, for example Startup, Vehicle observation due, or Select target SoC.

A trigger is rendered as a diamond with the trigger text centered inside it. The diamond uses the same typography, stroke weight, and corresponding visual weight as a Behavior; shape is the primary visual distinction between Trigger and Behavior.

The diamond is sized deterministically to its content. Long trigger text is wrapped deterministically inside the diamond, and the diamond is sized to the resulting wrapped text with sufficient internal clearance.

A Trigger is only a source of Pulse Flows and therefore has only outgoing connectors. Identical trigger text is rendered as one diamond with fan-out where applicable.

Trigger remains a role in a Flow rather than a separately declared semantic element. It has no direct requirement address and therefore no requirement indicator.

### 4.4 Pulse notation

A Pulse is shown as a numbered circle integrated into the connector. The Pulse circle is not a connector label.

The center of the Pulse symbol lies exactly on the geometric path of the Pulse connector. The symbol is an integrated part of the connector and must not float above or beside it.

The same semantic Pulse uses the same display number wherever it appears. A different Pulse receives a different display identity. Fan-out repeats the Pulse symbol on every branch.

### 4.5 Pulse legend

Every Pulse diagram includes a Pulse legend listing every declared Pulse in declaration order:

```text
PULSES
01  Vehicle observation
02  Vehicle state updated
03  Price retrieval
```

The legend is part of the diagram itself and therefore appears in the permanent PDF review artifact, not only in supplementary HTML. The short number is display identity only. Cross-references use the semantic Pulse ID.

### 4.6 Rendering status

- Behavior: Native D2.
- Trigger: Native D2 diamond, with deterministic text wrapping and sizing.
- Connector routing and arrowhead: Native D2/ELK.
- Pulse symbol: Adapted by minimal deterministic SVG decoration.

Decoration derives the Pulse symbol position from the actual SVG connector path.

## 5. UI

### 5.1 Purpose

UI describes user-visible system capability in terms of Views, Information, Actions, and meaningful Navigation between Views.

UI does not describe layout details, responsive design, colors, typography, widgets, form controls, gestures, scrolling, animation, technical components, or API calls.

A useful granularity test is: if two UI elements can be redesigned independently without changing the system's user function, they are probably presentation and should not be separate View elements.

### 5.2 View

A View is a user-relevant system surface. It is rendered as a rounded container with its name as the container title.

### 5.3 Information

Information represents a user-relevant concept shown by a View. Its name is a noun or noun phrase and is independent of its UI representation.

User-relevant status, errors, and indicators may be Information when they represent meaningful concepts. Individual visual states are not separately modeled merely because the UI renders them differently.

Information is rendered with a filled-circle symbol followed by the Information name.

### 5.4 Action

An Action represents an intentional user domain action that affects the system or the user's work state. Its name is a verb phrase.

Actions model user intent, not gestures or controls. Examples include Select target SoC, Select deadline, and Return to automatic control.

Scrolling, swiping, opening a tooltip, or tapping a particular widget are not Actions unless the domain intent itself is significant.

Action is rendered with a triangular action symbol followed by the Action name.

### 5.5 Information and Action layout

Within a View:

- Actions are placed in the left column.
- Information is placed in the right column.
- Action and Information item labels are left-aligned within their respective columns.
- Items within each column follow the order declared in the semantic artifact.
- No separate ACTIONS or INFORMATION headings are used.
- The distinct Action and Information symbols carry the distinction.

This is a normative Visual Language rule, not a statement about the application's actual screen layout.

A View with no Actions naturally renders as an Information-only View.

### 5.6 SubView inclusion and Navigation

A SubView is a reusable user-visible fragment included in one or more Views.

The SubView definition is rendered once as a View-like rounded container on the same diagram level as Views. Actions and Information declared by the SubView use the same semantic symbols and two-column ordering as in a View. Navigation entries declared by the SubView are rendered as directed navigation relations from this standalone SubView container to the referenced Views. The destination is represented by the relation itself rather than repeated as text inside the SubView.

An `includes` relation is rendered separately inside the including View. For each included SubView, the View contains a small SubView reference box showing only the SubView name. Its border is dashed or dotted so that it is visually distinguishable from ordinary View contents. No connector is drawn between this contained reference box and the standalone SubView definition.

The contained SubView reference box expresses inclusion only. It does not duplicate the SubView's Actions, Information, Navigation, or other semantics. The standalone SubView definition remains the single graphical place where the SubView's own relations are shown.

Thus the same semantic SubView has two complementary graphical occurrences: one standalone definition and one small inclusion reference inside each View that includes it. Both occurrences represent the same SubView identity.

View-local Navigation remains available for user-significant paths that are not represented by a SubView. Navigation relations use a lighter or dashed directed relation so they remain visually secondary to View and SubView contents.

### 5.7 Rendering status

- View container: Native D2.
- Information and Action symbols and text: Native D2.
- Two-column layout: Native or generated D2 structure with deterministic ordering.
- Navigation: Native D2 when present.

No SVG postprocessing is required for the verified UI notation.

## 6. Deployment

### 6.1 Purpose

Deployment shows one concrete intended execution topology: hosts, programs, Compose services, ports, and directed network connections. It is an implementation diagram and does not alter Context, Pulse, or UI semantics.

### 6.2 Elements

- **Host:** a strong rectangular container labeled with name, host type, operating system, and architecture when declared.
- **Program:** a rounded container inside its host, labeled with program type, role, language, and platform when applicable.
- **Compose service:** a rounded container within a Docker Compose project's Services area.
- **Port:** a small rounded element within its program or service, labeled with application or transport protocol, process/container port, optional published host port, and exposure.
- **Connection:** a directed connector between programs, services, or ports, labeled with its name and declared protocols.

Containment means deployment containment only. A host contains programs; a Docker Compose program contains services; a program or service contains its ports. Connections do not imply Pulse causality or Context data semantics.

### 6.3 Connection labels

A Deployment connection label is an annotation, not part of the connector. It is placed with clear visual separation above the relevant connector segment, following the same clearance principle as Context relation labels. A connection line must not pass through or immediately adjacent to visible label text.

### 6.4 Requirement indicators

Hosts, programs, services, ports, and connections are visible, addressable elements. Each displays an `r` circle if and only if it has directly attached requirements. Activating the circle uses the same exact-requirement review behavior as the CPU diagrams.

### 6.5 Rendering status

Host, program, service, port, containment, and network connectors are Native D2/ELK constructions. Requirement indicators are Adapted deterministic SVG decoration.

## 7. Artifact-specific semantic sources

Visual Language v1 intentionally does not define a generic metamodel. The preferred sources are small artifact-specific YAML formats:

```text
system/
  context.yaml
  pulse.yaml
  ui.yaml
  deployment.yaml
  requirements.yaml
```

Generated artifacts:

```text
context.yaml -> context.d2 -> context.svg
pulse.yaml   -> pulse.d2   -> pulse.svg
ui.yaml      -> ui.d2      -> ui.svg
deployment.yaml -> deployment.d2 -> deployment.svg
```

Artifact-specific vocabulary is intentionally asymmetric and should remain understandable to a human reader.

## 8. Identity

Machine-readable IDs are simple and stable within their natural artifact scope. v1 does not introduce UUIDs, namespaces, or a global identity registry.

`name` is display text and may change while `id` remains stable. Pulse additionally has a short display identity such as `01`; that display identity is not semantic identity.

General cross-artifact references are not normative in v1. Semantic duplication between artifacts is acceptable rather than prematurely introducing cross-artifact reference machinery. Requirement addresses are the defined limited exception.

## 9. Renderer acceptance classes

- **Native:** notation rendered directly and deterministically by D2.
- **Adapted:** a small deterministic generated construction or SVG decoration is required.
- **Unsupported:** notation would require manual positioning or substantial unstable SVG manipulation.

Current v1 classification:

| Feature | Classification |
| --- | --- |
| System / External system / Person | Native |
| View | Native |
| Information | Native |
| Action | Native |
| Behavior | Native |
| Trigger | Native |
| Deployment host / program / service / port | Native |
| Deployment network connection | Native |
| D2/ELK connector routing | Native |
| Pulse symbol on connector | Adapted |
| Context initiative circle | Adapted |
| Context label clearance | Adapted where required |

No current Visual Language v1 requirement justifies a custom full renderer.

## 10. Determinism and implementation constraints

The renderer implementation:

- pins the D2 version;
- pins the layout engine;
- generates D2 deterministically from semantic YAML;
- performs only deterministic SVG decoration;
- derives semantic-symbol placement from actual rendered connector geometry where required;
- avoids manual per-diagram pixel fixes;
- avoids image-AI redrawing;
- preserves semantic meaning independently of renderer limitations.

Minimal SVG decoration is acceptable when it implements a stable Visual Language rule. It must not become an uncontrolled second layout engine.

## 11. Verified v1 decisions

- **Context:** system and external-system composition; domain data-flow labels; independent arrowhead for data direction; initiative circle centered on connector path; visible separation between initiative circle and arrowhead; connector and label clearance; sufficient relation spacing.
- **Pulse:** left-to-right causal flow using ELK; Behavior nodes; Trigger diamonds with centered, deterministically wrapped text and fan-out for identical trigger text; numbered Pulse circle integrated into connector; Pulse circle centered on actual connector path; Pulse legend included in the diagram.
- **UI:** View containers; Action and Information symbols; Actions in the left column; Information in the right column; left-aligned item labels; deterministic declared ordering within each column.
- **Deployment:** nested host/program/service topology; visible ports and directed connections; connection labels clearly separated above connector geometry; implementation selections shown in labels.
- **All diagrams:** consistent outer clearance between visible diagram content and the exported viewport.

These verified rendering decisions constitute Visual Language v1.

## 12. Requirement indicators

Requirement indicators provide interactive access to requirements without changing Context, Pulse, or UI semantics. The renderer baseline remains D2 0.9.0 with ELK. Requirement targets and source format are defined by Artifact Formats v1.

### 12.1 Purpose and meaning

A requirement indicator shows that requirements are directly attached to a model element. It is a review annotation and access control, not a new semantic model element, data flow, Pulse, or Action.

The indicator is a small outlined circle containing lowercase `r`. It has a clear opaque background; the letter is centered and readable. Meaning remains clear in black and white; color is optional and secondary.

Show an indicator if and only if the element has a resolved, non-empty requirement attachment. A container's indicator represents that container's own requirements, not the union of its contents' requirements.

### 12.2 Binding and repeated occurrences

Each indicator binds to exactly one target address from `requirements.yaml`. Activating it opens the requirements for that target. Never bind by label text or Pulse display number.

One indicator is shown per rendered occurrence. Where the same Pulse is drawn on several branches, every occurrence receives the indicator and opens the same attachment.

### 12.3 Placement

Placement is deterministic and derived from actual rendered geometry. The indicator appears close enough to its element that the attachment is unambiguous.

- Context flow: beside the data-flow label, separated from both label and connector.
- System, party, or Behavior: near the label or in a clear corner of the shape.
- Pulse: beside the numbered Pulse symbol, outside that symbol and away from the connector path. Never place `r` inside the numbered circle.
- View: beside the View title, representing requirements attached directly to that View.
- Action or Information: beside the item's label, preserving existing semantic symbols.
- Deployment host, program, service, or port: beside its label or in a clear corner of its containing shape.
- Deployment connection: beside its relation label and clear of the connector and arrowhead.

An indicator must not overlap another indicator, label, arrowhead, initiative symbol, numbered Pulse symbol, unrelated element, or connector. Use consistent size and minimum clearance across diagrams; do not introduce manual per-diagram pixel fixes.

If space is unavailable, adjust deterministic generation or layout spacing. Do not weaken notation or introduce an unstable second layout engine. Keep indicators inside the exported viewport without clipping.

### 12.4 PDF review behavior

The permanent review surface is a PDF generated from the finished decorated SVG. PDF generation must not redraw, relayout, or reinterpret the diagram. The diagram page uses the exact finished SVG rendering as its graphical source.

Every visible `r` indicator has one PDF Text annotation whose contents are the complete requirement strings directly attached to the target, in declared order and without paraphrasing or omission.

The Text annotation's note icon is placed deterministically outside the `r` circle, attached at approximately the 14 o'clock position. It must not obscure the circle or its letter.

The permanent PDF deliberately contains no internal requirement pages or link annotations. This keeps the artifact smaller and structurally simpler and makes the popup annotation the single requirement-review interaction.

Chrome is the reference reader for the complete popup review interaction. Reader-specific popup appearance is not part of the Visual Language.

### 12.5 Accessibility and supplementary interactive surfaces

The permanent PDF review uses its visible `r` indicators and Text annotations for requirement access. A PDF reader that does not expose Text annotations cannot provide the complete requirement-review interaction.

An HTML review surface may additionally be generated for browser-based exploration, keyboard interaction, or source inspection. It is supplementary and is not the permanent reviewed artifact. If supplied, its requirement selection must preserve the same target binding and exact ordered requirement text.

Standalone SVG and PNG retain visible requirement indicators and the legend explaining that `r` denotes directly attached requirements. They are diagram artifacts, not substitutes for the permanent PDF review.

### 12.6 Export and rendering

Generate indicators as minimal deterministic SVG decoration after D2/ELK rendering. Do not add badge fields to semantic YAML or model indicators as layout nodes. Bindings derive from validated attachments; positions derive from rendered element geometry.

After SVG decoration is complete, generate the PDF from that finished SVG. PDF annotation and link geometry derives from the actual rendered `r` positions. PDF finishing must not alter diagram geometry.

The repository-backed review output retains the finished SVG and the permanent PDF. PNG and supplementary HTML may also be emitted. Generated review artifacts never replace the semantic YAML sources.

### 12.7 Acceptance

- Every rendered occurrence with directly attached requirements has one readable indicator; occurrences without attachments have none.
- Indicators preserve all existing semantics and notation, including Pulse-circle and initiative geometry.
- No indicators, labels, note icons, or semantic symbols collide or become clipped at normal review size.
- The PDF diagram rendering is graphically identical to the finished SVG apart from PDF viewer annotation UI.
- Every indicator's Text annotation contains exactly its target's complete ordered requirements.
- The note icon attaches at approximately 14 o'clock without obscuring the `r` indicator.
- Given identical semantic sources, requirements, Visual Language version, D2 version, and PDF generator version, output is deterministic.
