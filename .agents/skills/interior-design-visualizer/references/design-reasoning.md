# Interior Design Reasoning

## Contents

- Evidence hierarchy
- Homeowner-language translation
- Existing-space diagnosis
- Professional design decisions
- Reference adaptation
- Preserved geometry and corrections
- Connected architectural assemblies
- Construction plausibility

## Evidence hierarchy

Use this priority order when evidence conflicts:

1. Latest direct user correction.
2. Explicit homeowner requirement in chat, transcript, or annotation.
3. Geometry reference identified by the user.
4. Edit target's existing architecture and circulation.
5. Local design reference.
6. Global style or mood reference.
7. Designer judgment.

Do not allow a lower-priority aesthetic preference to override a higher-priority constraint.

## Homeowner-language translation

Homeowners often describe outcomes with incomplete phrases such as “make this black,” “use this look,” or “keep the right side.” Translate them into a design objective before writing a prompt.

Ask:

- What visual problem are they trying to solve: fragmentation, heaviness, imbalance, clutter, weak focus, poor storage?
- Does the annotation indicate color, scope, alignment, or an object to replace?
- What did they explicitly reject?
- Is the desired change local, or must adjacent geometry change for the result to look intentional?

Never assume a red line must become a physical line. Determine whether it marks a boundary, a region, a route, or emphasis.

In common Chinese project chat, “红框那个做成黑色,” “框起来的地方,” and similar wording usually mean “the area selected by the red frame,” not “build a black frame where the red stroke is.” Default to the selected volume or surface. Create a physical border only when the user says “加边框/收口条/黑色框体” or a detail reference shows one.

## Existing-space diagnosis

Review the base space in these dimensions:

### Composition

- Identify the focal wall and competing visual centers.
- Check balance between left/right visual weight.
- Check whether vertical elements interrupt a desired horizontal composition.
- Preserve useful negative space; avoid filling every surface.

### Proportion and alignment

- Align related openings, shelves, screens, panels, and cabinets deliberately.
- Avoid thin leftover strips, accidental gaps, and unsupported projections.
- Scale new modules to the available wall, not to the reference image's absolute proportions.

### Function

- Preserve circulation, door swing, access panels, outlets, ventilation, and viewing height.
- Decide whether display, concealed storage, audio equipment, and lighting need integration.
- Avoid shelves that are too deep, cabinets that obstruct paths, or inaccessible controls.

### Material and light

- Limit dominant materials; use contrast to establish hierarchy.
- Match material texture scale to the room and camera distance.
- Separate matte wall finishes, reflective screens, timber, stone, and metal through believable highlights.
- Continue existing light direction and color temperature unless a lighting change is requested.

## Professional design decisions

When the user gives direction but not a complete design, decide the missing details. Good designer decisions include:

- combining fragmented TV and display elements into one visual composition;
- widening or re-dividing shelving to balance a screen;
- removing a protruding compartment that breaks alignment;
- retaining a white floating plinth to separate it from a dark focal volume;
- adapting a reference niche to the opposite side of the room;
- resolving curved walls, reveals, door panels, and curtains as buildable junctions.

Make these decisions explicit in the prompt as **designer decisions**, not as homeowner quotes.

## Reference adaptation

For every reference, decide what to transfer:

- geometry;
- material;
- cabinet organization;
- edge treatment;
- color;
- lighting;
- atmosphere.

Also state what not to transfer: the reference room, furniture, artwork, television content, watermark, crop, or camera.

If the reference is on the opposite side, mirror the relationship only when it fits the base room. Recalculate widths, shelf count, cabinet doors, and clearances from the target space.

## Preserved geometry and corrections

When the user supplies extra views to preserve an area, study junctions rather than naming a generic object. For example, “keep the original door” may actually mean:

- a rounded wall return before the door plane;
- a double vertical reveal on one side;
- a top horizontal line but no visible right or bottom frame;
- a door edge hidden behind a curtain;
- a specific handle position and wall-to-ceiling transition.

Describe those relationships literally. Do not replace them with “standard concealed door.”

During revisions, treat the latest correction as a local geometry lock. Preserve all previously approved areas and edit only the named defect.

## Connected architectural assemblies

Do not equate a user's everyday area name with a strict pixel boundary. Trace the physical construction shown by the references.

Examples:

- “Keep the original right side” may include the television wall's rounded return, the recessed door plane, the door trim, and the plinth that terminates at that return.
- “Replace the display cabinet” may require changing its backing, side returns, lighting, lower storage, and the transition to the adjacent television panel.
- “Keep the lower step” may lock the plinth, fireplace slot, light source, termination, and wall connection—not only its color.

Use the narrowest edit scope that preserves the complete connected assembly. Do not leave an impossible junction merely because part of it lies outside a hand-drawn circle.

## Construction plausibility

Before generation, check whether the concept could be detailed in real construction:

- panels and shelves have support and plausible thickness;
- cabinet doors can open;
- shadow gaps and reveals terminate cleanly;
- curves connect continuously across wall and ceiling;
- tiles or stone have realistic module scale and joints;
- lighting has a believable source and service access;
- no cabinet, wall, or curtain occupies the same physical space.

Image2 may beautify impossible geometry. The prompt must prevent that before generation.
