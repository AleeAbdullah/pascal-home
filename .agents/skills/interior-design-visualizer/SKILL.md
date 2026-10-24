---
name: interior-design-visualizer
description: Use when residential interior-image tasks involve room photos, renderings, VR screenshots, homeowner chats, voice transcripts, redline annotations, mood references, local design references, or requests to preserve selected architectural features while redesigning other areas.
---

# Interior Design Visualizer

## Overview

Treat inputs as design evidence, not pixels to copy mechanically. Translate homeowner intent into one professional, buildable design before asking image2 to render it.

**REQUIRED SUB-SKILL:** Use `imagegen` for image2 generation, result extraction, file verification, saved-image inspection, correction, inline display, and download delivery.

## Non-negotiable rules

1. Design before generating; do not forward raw chat language directly to image2.
2. Separate **explicit requirements**, **designer decisions**, and **locked invariants**.
3. Treat redlines as scope evidence. In Chinese design chat, phrases such as “红框区域,” “框起来的地方,” or “红色框线那个” normally identify the selected area. Do not create a physical outline unless the user or construction reference explicitly requests a border/frame component.
4. Adapt local references to the edit target's scale, side, circulation, and architecture; never paste the reference room wholesale.
5. Make the latest correction authoritative. Images named by the user become geometry references, not optional inspiration.
6. Trace connected construction. A named area may include its wall return, plinth, fireplace, reveal, ceiling junction, or recessed plane.
7. Preserve locked areas exactly, but redesign the requested area when proportion, hierarchy, function, or buildability requires it.
8. Do not invent built-in image2 masks, quality flags, exact-size controls, or output-path arguments.
9. Deliver the saved image, not only a completion statement.

## Workflow

### 1. Inventory and inspect

Open every image with `view_image`. Label each as: edit target, chat/annotation evidence, local design reference, global style reference, geometry reference, latest correction, or permitted final-effect reference.

Do not let a supporting reference replace the edit target's room, furniture, or view. If the user requests a blind design, exclude the final-effect reference. If it already appeared in the same task, disclose that strict isolation requires a fresh task.

### 2. Design

Read `references/design-reasoning.md` completely. Diagnose composition, proportion, alignment, function, circulation, material, lighting, transitions, and connected construction. Resolve routine design details professionally; ask only when competing interpretations would materially change room function, major structure, or the user's goal.

Choose one coherent solution. Briefly state the design conclusion in commentary before generation.

### 3. Reconstruct VR inputs

For mobile or VR screenshots, remove all interface elements, labels, watermarks, redlines, and black bars. Reconstruct a clean landscape view at normal eye height with straight verticals; do not stretch the portrait screenshot. Preserve recognizable architecture and locked features.

### 4. Write the image2 brief

Read `references/prompt-template.md` completely. Include image roles, homeowner requirements, designer solution, geometry, connected assemblies, materials, lighting, camera treatment, invariants, forbidden drift, and a distinctive extraction marker.

Use literal relationships: “align top and bottom,” “hide the right edge behind the curtain,” or “terminate the plinth at the rounded return.”

### 5. Generate and persist

Follow `imagegen` exactly: call built-in image2 first, save the exact result under `outputs/`, verify its signature and dimensions, then inspect that saved file with `view_image`. Do not configure API keys, VPNs, or unrelated UI automation to recover a built-in result.

### 6. Review and correct

Read `references/qa-checklist.md` completely. Check explicit requirements, designer decisions, invariants, geometry-reference fidelity, buildability, camera, materials, UI cleanup, and AI artifacts.

If one defect dominates, perform one targeted image2 correction. Name the defect, change only that connected area, repeat all invariants, save a versioned file, and inspect again.

### 7. Deliver

Render the saved absolute path inline, link to the same file for download, and state the design outcome plus the roles of the source images.

## Quick reference

| Situation | Response |
|---|---|
| “Make the red-framed area black” | Treat the frame as a selection boundary; redesign or recolor the selected volume unless a physical border is explicitly requested |
| Reference is on the opposite side | Mirror and rescale it while protecting circulation |
| “Keep the original right side” | Follow supplied geometry and its connected assembly; do not substitute a generic door |
| VR phone screenshot | Clean UI, reconstruct landscape perspective, preserve architecture |
| Final effect absent | Design independently |
| One generated area is wrong | Make one local correction, not a full rewrite |
| image2 returns no path | Use `imagegen` artifact extraction |

## Common mistakes

- Preserving weak original geometry instead of solving the design problem.
- Copying unrelated furniture, watermark, crop, or camera from a reference.
- Editing only a guessed rectangle while leaving an impossible connected junction.
- Redesigning a locked zone for convenience.
- Accepting a generic object with the right name but wrong geometry.
- Claiming completion before saving, inspecting, displaying, and linking the image.
