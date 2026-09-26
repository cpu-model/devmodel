# CPU Visual Language v1

- Status: Normative v1
- Renderer baseline: Node.js native PDF renderer
- PDF library: pdf-lib 1.17.1
- Primary and permanent review output: native vector PDF

## 1. Purpose

Visual Language v1 defines the notation used to render Context, Pulse, UI, and the complementary Deployment artifact.

The semantic artifacts are authoritative. The visual language defines notation. The renderer computes artifact-specific layout and draws vector primitives directly into PDF pages.

Rendering must be deterministic and reproducible. Semantics must never be weakened or changed to accommodate renderer limitations.

```text
semantic YAML
    |
    v
generator
    |
    v
strict artifact-specific validation
    |
    v
deterministic artifact-specific layout
    |
    v
native PDF vector drawing + PDF Text annotations
```

The same semantic input, Visual Language version, renderer version, and PDF-library version must produce the same diagram geometry and annotation binding.

## 2. General principles

The symbol expresses what something is. The edge expresses the relationship. The text expresses the system-specific meaning.

Color is secondary. The notation must remain understandable in black and white.

Stable semantic IDs belong to source artifacts. Display text may change without changing identity.

Generated PDF diagrams are derived artifacts; semantic YAML is the source.

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

- Context nodes, person symbol, connectors, initiative symbols, labels, and arrowheads are native PDF vector constructions.
- Layout and label clearance are computed deterministically before drawing.

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

Trigger remains a role in a Flow rather than a separately declared semantic element. It has no direct requirement address and therefore no requirement annotation.

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

- Behavior, Trigger, connector, arrowhead, and Pulse symbol are native PDF vector constructions.
- Trigger text wrapping and sizing are deterministic.
- Pulse-symbol placement derives from the computed connector geometry and lies exactly on its path.

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

- View and SubView containers, Information and Action symbols, inclusion references, and Navigation are native PDF vector constructions.
- The two-column layout and declared item ordering are computed deterministically.

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

### 6.4 Requirement annotations

Hosts, programs, services, ports, and connections are visible, addressable elements. Each rendered occurrence receives a native PDF popup annotation if and only if it has directly attached requirements.

### 6.5 Rendering status

Host, program, service, port, containment, and network connectors are native PDF vector constructions. Requirement popup markers are PDF annotation appearance streams.

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

Generated review artifacts:

```text
context.yaml + requirements.yaml -> context.pdf
pulse.yaml + requirements.yaml -> pulse.pdf
ui.yaml + requirements.yaml -> ui.pdf
deployment.yaml + requirements.yaml -> deployment.pdf
```

Artifact-specific vocabulary is intentionally asymmetric and should remain understandable to a human reader.

## 8. Identity

Machine-readable IDs are simple and stable within their natural artifact scope. v1 does not introduce UUIDs, namespaces, or a global identity registry.

`name` is display text and may change while `id` remains stable. Pulse additionally has a short display identity such as `01`; that display identity is not semantic identity.

General cross-artifact references are not normative in v1. Semantic duplication between artifacts is acceptable rather than prematurely introducing cross-artifact reference machinery. Requirement addresses are the defined limited exception.

## 9. Renderer acceptance classes

- **Native:** notation rendered directly and deterministically as PDF vector primitives or PDF annotations.
- **Computed:** deterministic geometry is calculated from validated semantic input before drawing.
- **Unsupported:** notation would require manual per-diagram positioning or semantic inference from generated layout.

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
| Orthogonal connector routing | Computed |
| Pulse symbol on connector | Computed |
| Context initiative circle | Computed |
| Context label clearance | Computed |
| Requirement popup annotation | Native |

The artifact-specific native PDF renderer is the normative renderer.

## 10. Determinism and implementation constraints

The renderer implementation:

- pins the PDF library version;
- validates all five semantic sources before drawing;
- computes layout deterministically from semantic YAML;
- derives semantic-symbol and annotation placement from the same computed geometry used for drawing;
- avoids manual per-diagram pixel fixes;
- avoids image-AI redrawing;
- preserves semantic meaning independently of renderer limitations.

## 11. Verified v1 decisions

- **Context:** system and external-system composition; domain data-flow labels; independent arrowhead for data direction; initiative circle centered on connector path; visible separation between initiative circle and arrowhead; connector and label clearance; sufficient relation spacing.
- **Pulse:** left-to-right causal flow; Behavior nodes; Trigger diamonds with centered, deterministically wrapped text and fan-out for identical trigger text; numbered Pulse circle integrated into connector; Pulse circle centered on the computed connector path; Pulse legend included in the diagram.
- **UI:** View containers; Action and Information symbols; Actions in the left column; Information in the right column; left-aligned item labels; deterministic declared ordering within each column.
- **Deployment:** nested host/program/service topology; visible ports and directed connections; connection labels clearly separated above connector geometry; implementation selections shown in labels.
- **All diagrams:** consistent outer clearance between visible diagram content and the exported viewport.

These verified rendering decisions constitute Visual Language v1.

## 12. Requirement popup annotations

Requirement popup annotations provide interactive access to requirements without changing Context, Pulse, UI, or Deployment semantics. Requirement targets and source format are defined by Artifact Formats v1.

### 12.1 Purpose and meaning

An annotation marker shows that requirements are directly attached to a model element. It is review presentation, not a semantic model element, data flow, Pulse, Action, or deployment relation.

The marker is a 14 by 14 point blue square with a white speech-bubble glyph. It is the normal appearance stream of a native PDF Text annotation. The former CPU-rendered `r` circle and its legend are not used.

Show a marker if and only if the element has a resolved, non-empty requirement attachment. A container's marker represents that container's own requirements, not the union of its contents' requirements.

### 12.2 Binding and repeated occurrences

Each annotation binds to exactly one target address from `requirements.yaml`. Its `Contents` contains the complete requirement strings for that target in declared order, separated by one blank line. Never bind by label text or Pulse display number.

One annotation is created per rendered occurrence. Where the same Pulse or SubView is drawn more than once, every occurrence receives an annotation opening the same attachment.

### 12.3 Placement

Placement is deterministic and derives from the same computed geometry used to draw the diagram. The marker appears close enough to its element that the attachment is unambiguous.

- Context flow: immediately to the left of the data-flow label, on the same visual baseline and clear of the connector.
- System, party, Behavior, View, SubView, Deployment host, program, service, or port: in a clear upper corner inside the shape.
- Pulse: beside the numbered Pulse symbol and away from the connector path.
- Action or Information: immediately to the right of the visible label.
- Included SubView reference: at the right side of the reference box.
- Deployment connection: to the left of its relation label, with at least 16 points of horizontal safety clearance for readers that enlarge annotation icons, and clear of the connector and arrowhead.

A marker must not overlap another marker, label, arrowhead, initiative symbol, numbered Pulse symbol, unrelated element, or connector. If space is unavailable, adjust deterministic generation or layout spacing rather than moving markers manually.

### 12.4 PDF structure and behavior

Each marker is a native PDF `/Text` annotation with:

- subtype `Text` and name `Comment`;
- a custom normal appearance stream for the blue speech-bubble marker;
- an explicitly linked `/Popup` annotation;
- `Open false` so the document does not force popups open;
- a light annotation color to maintain contrast in readers that use it for popup presentation.

The PDF contains no CPU-rendered requirement text, internal requirement pages, or link annotations. Activating the Text annotation is the single requirement-review interaction. Reader-specific popup window chrome, fonts, and minimum icon scaling are outside the Visual Language.

### 12.5 Accessibility and viewer compatibility

Readers that expose PDF Text annotations provide popup interaction and may also list the annotations in a comments panel. Readers that do not expose annotations cannot provide the requirement interaction. The exact requirement strings remain embedded in the PDF annotation data.

The custom appearance stream provides a consistent marker where the reader honors annotation appearances. A reader may impose a minimum on-screen annotation-icon size; the annotation rectangle remains the normative 14 by 14 points.

### 12.6 Export and rendering

The renderer draws diagram geometry and creates annotations in one native PDF generation pass. It does not create SVG, raster images, browser DOM layout, or a second finishing stage. Annotation placement uses the renderer's computed layout geometry directly.

The repository-backed review output consists only of `context.pdf`, `pulse.pdf`, `ui.pdf`, and `deployment.pdf`. Diagnostic PNG rendering may be used temporarily for visual QA but is not a durable project artifact.

### 12.7 Acceptance

- Every rendered occurrence with directly attached requirements has one visible Text-annotation marker; occurrences without attachments have none.
- Markers preserve all existing semantics and notation, including Pulse-circle and initiative geometry.
- No marker, label, semantic symbol, connector, or arrowhead collides or becomes clipped at normal review size.
- Every Text annotation contains exactly its target's complete ordered requirements.
- Every Text annotation has a non-empty normal appearance and an explicitly linked Popup annotation.
- No annotation is forced open when the document loads.
- Given identical semantic sources, requirements, Visual Language version, renderer version, and PDF-library version, output geometry and annotation binding are deterministic.
