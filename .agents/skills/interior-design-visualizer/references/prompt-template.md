# Image2 Prompt Template for Interior Design

Use the sections that matter; keep the final prompt concrete and avoid speculative decoration.

```text
Use case: <precise-object-edit | compositing | sketch-to-render>
Asset type: photorealistic residential interior design rendering

Input roles:
- Image 1: edit target and architectural anchor.
- Image 2: <chat/annotation evidence | local design reference | geometry reference>.
- Image 3: <role if applicable>.

Homeowner requirements:
- <explicit requested outcome>
- <explicit exclusions>
- <latest correction>

Existing-space diagnosis:
- <current visual/functional problem>

Designer solution:
- <one coherent concept>
- <proportion and alignment>
- <storage/function/circulation>
- <transition to existing architecture>

Geometry:
- <left/right placement, top/bottom alignment, widths, reveals, curves, door or cabinet junctions>
- <connected return, plinth, fireplace, ceiling junction, or recessed plane that belongs to the same assembly>

Materials and lighting:
- <surface, finish, reflectivity, texture scale, color temperature, light source>

Camera and composition:
- <preserve existing view or reconstruct VR screenshot>
- <eye height, straight verticals, landscape framing, foreground control>

Locked invariants:
- <architecture and objects that must not move or change>

Do not transfer from references:
- <unrelated room, furniture, text, watermark, crop, camera, props>

Avoid:
- <geometry drift, duplicated objects, warped shelves, wrong material scale, UI, redlines, text, watermarks>

Output intent:
- clean, photorealistic, buildable residential interior visualization.

Distinctive marker: <unique phrase for artifact extraction>
```

## Prompt-writing rules

1. Use image indices and roles. Never say only “use the other image.”
2. Put the edit target first and call it the architectural anchor.
3. Separate homeowner requirements from designer decisions.
4. Describe geometry using relationships, not adjectives.
5. Repeat locked invariants in every correction prompt.
6. For a local reference, specify both what to transfer and what not to transfer.
7. For VR input, require removal of all interface elements and reconstruction rather than stretching.
8. Do not include fallback CLI flags, mask parameters, output paths, or unsupported exact-size promises in a built-in image2 prompt.

## Example: local reference adapted to a VR room

```text
Use case: compositing
Asset type: photorealistic residential interior rendering

Input roles:
- Image 1: VR screenshot edit target and sole architectural anchor.
- Image 2: local reference for the display niche only.

Homeowner requirements:
- Replace the circled open rack beside the television with the referenced niche design.
- Keep the television, ceiling, floor, doorways, and illuminated white plinth.

Existing-space diagnosis:
- The narrow hanging rack feels fragmented and does not match the room's rounded architectural language.

Designer solution:
- Mirror and resize the reference niche to fit the left side of the television.
- Use a warm textured backing, three timber shelves, and a light floating cabinet.
- Join the niche to the television wall with a continuous warm-white rounded return.

Camera and composition:
- Remove the mobile and VR interface.
- Reconstruct a clean landscape view at normal eye height with straight verticals; do not stretch the portrait screenshot.

Locked invariants:
- Preserve room layout, circulation, circular ceiling, television, plinth, flooring, curtains, and lighting.

Do not transfer from Image 2:
- Its room, sofa, table, television image, watermark, text, or camera angle.

Avoid:
- copied room geometry, warped shelves, intrusive cabinet depth, UI, redlines, text, or watermarks.

Distinctive marker: VR room with mirrored display niche adaptation.
```
