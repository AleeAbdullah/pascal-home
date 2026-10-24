# Interior Visualization QA Checklist

Inspect the saved image, not only the transient image2 preview.

## 1. Requirement check

- Did every explicit homeowner request appear?
- Did every explicit “do not change” remain unchanged?
- Did the latest correction override earlier assumptions?
- Was an annotation interpreted as intended scope rather than copied literally?
- If chat used “红框/框起来的地方,” did the result avoid inventing a physical border without supporting evidence?

## 2. Design check

- Is there a clear focal hierarchy?
- Are related elements aligned intentionally?
- Are widths, heights, shelf spacing, cabinet divisions, and negative space balanced?
- Does the new feature solve the existing visual or functional problem?
- Does it look like one designed composition rather than a pasted object?

## 3. Geometry-reference check

- Compare curves, reveals, panel lines, door edges, handles, cabinet junctions, and curtain overlaps against the supplied geometry views.
- Do not accept a generic object with the right name but the wrong construction.
- Check which edges should be visible, hidden, open, recessed, rounded, or continuous.
- Follow connected components beyond the colloquial area name: wall returns, plinth ends, fireplaces, ceiling lines, and recessed planes must terminate as shown.

## 4. Architecture and function check

- Are doors, paths, windows, switches, television sightlines, and storage access plausible?
- Did the model move walls, openings, columns, or ceiling features without authorization?
- Are shelves supported and cabinets buildable?
- Do surfaces collide or occupy impossible space?

## 5. Material and lighting check

- Is the material module scale realistic?
- Are timber, stone, paint, metal, and glass visually distinct?
- Are light direction, shadows, reflections, and color temperature consistent with the base space?
- Are dark surfaces readable rather than merging into a flat black shape?

## 6. VR and image-quality check

- Are all phone bars, browser chrome, VR controls, labels, redlines, logos, and watermarks removed?
- Is the result a naturally reconstructed landscape view rather than a stretched portrait image?
- Are verticals straight and wide-angle distortion controlled?
- Are important walls visible without excessive ceiling or foreground dominance?
- Are there warped shelves, duplicate props, malformed plants, smeared textures, or residual text?

## 7. Invariant check

Compare the result with the edit target and list any drift in:

- camera and crop;
- doors and openings;
- ceiling and floor pattern;
- television and fixed furniture;
- curtains and windows;
- previously approved design areas.

## 8. Correction rule

If one defect dominates, perform one targeted correction:

1. Name the current defect.
2. Specify the correct geometry or material using the relevant reference.
3. State “change only this area.”
4. Repeat every locked invariant.
5. Save to a versioned filename.
6. Inspect again.

Do not rewrite the whole creative brief during a local correction.

## 9. Delivery check

- Saved file exists and is non-empty.
- PNG/JPEG/WebP signature is valid and the image decodes.
- Dimensions and format were reported.
- Saved file was opened with `view_image`.
- Final response renders the absolute local path inline.
- Final response links to the same file for download.
