# Pascal runtime patches

Small changes applied to the locally installed Pascal web runtime (`.pascal/runtime/<version>`),
which is a prebuilt bundle we do not compile ourselves.

## Trackpad navigation (`trackpad-navigation.js`)

Pascal's view-only camera (the editor's **Preview** mode and the `/embed/<project>` viewer) only
offered orbit on a plain drag and zoom on scroll; panning needed a middle or right mouse button.
On a laptop trackpad that made it impossible to move around a floor. This module adds:

| Gesture | Result |
| --- | --- |
| One-finger drag | Orbit (3D) · pan when looking straight down |
| Two-finger scroll | Pan, the scene follows your fingers |
| Pinch (ctrl + scroll) | Zoom towards the cursor |
| Shift + drag, Space + drag | Pan from any angle |
| Double-click | Centre the view on that spot |
| Arrow keys | Pan · with Shift: orbit and tilt |
| `+` / `-` | Zoom in / out |

Edit mode is untouched: the module only attaches when Pascal is in Preview (or the embed viewer)
and detaches when you leave it. A one-line hint is shown once per browser session.

## How it is installed

`scripts/patch-pascal-viewing.mjs` copies the module into the runtime's `public/` folder and
injects one React effect into the two camera components of the bundled editor. It keeps each
original chunk as `<chunk>.orig` and always re-applies from that, so it is safe to run repeatedly.
`scripts/pascal.mjs` runs it before and after `npm run editor`, `start`, `restart`, `resume`,
`open` and `update`, so a runtime upgrade is re-patched automatically.

```bash
npm run patch:viewing            # apply or refresh
npm run patch:viewing:restore    # put the original runtime back
```

After a patch, hard-reload any open Pascal tab once (the bundle is cached as immutable). If
the module file was new, restart Pascal as well so its static file list is rebuilt.

If a future Pascal runtime changes the camera component shape, the script fails with a message
naming which pattern it could not find, and the editor keeps running unpatched.
