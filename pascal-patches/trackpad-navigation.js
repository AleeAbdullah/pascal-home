// Trackpad-friendly navigation for Pascal's view-only camera (Preview mode and the
// embed viewer). Loaded into the Pascal runtime by scripts/patch-pascal-viewing.mjs.
//
// Gestures it adds, on top of one-finger drag to orbit:
//   two-finger scroll          pan (the scene follows your fingers)
//   pinch, or ctrl + scroll    zoom towards the cursor
//   drag in the top-down view  pan instead of spinning the plan
//   shift + drag, space + drag pan from any angle
//   double-click               centre the view on that spot
//   arrow keys                 pan;  shift + arrows orbit / tilt;  + and - zoom
//
// `attach` receives the React ref that holds the camera-controls instance and the
// component's current props. It returns a cleanup function.

const HINT_KEY = 'pascal.trackpad-hint-shown';

export function attach(ref, { selectable, cameraMode, walkthrough } = {}) {
  const controls = ref?.current;
  if (!controls || selectable || walkthrough) return () => {};
  const ACTION = controls.constructor.ACTION;
  const canvas = controls._domElement;
  if (!ACTION || !canvas) return () => {};
  const ortho = cameraMode === 'orthographic';
  const Vector3 = controls._target.constructor;
  const isFirefox = /firefox/i.test(navigator.userAgent);
  const previousDollyToCursor = controls.dollyToCursor;
  controls.dollyToCursor = true;
  // Lets a console or an automated check reach the live controls while the patch is attached.
  globalThis.__pascalTrackpadControls = controls;

  const topDown = () => ortho || controls.polarAngle < 0.12;
  const insideCanvas = (event) => event.target === canvas || canvas.contains(event.target);
  const typing = (event) => {
    const t = event.target;
    return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  };
  const changed = () => controls.dispatchEvent({ type: 'control' });

  // Pan one step in screen space, projected onto the ground so the view never lifts off the floor.
  const pan = (dx, dy) => {
    controls._getClientRect(controls._elementRect);
    controls._truckInternal(dx, dy, false, true);
    changed();
  };
  const zoomAt = (amount, clientX, clientY) => {
    controls._getClientRect(controls._elementRect);
    const rect = controls._elementRect;
    const x = ((clientX - rect.x) / rect.width) * 2 - 1;
    const y = -((clientY - rect.y) / rect.height) * 2 + 1;
    if (ortho) controls._zoomInternal(amount, x, y);
    else controls._dollyInternal(amount, x, y);
    changed();
  };
  const step = () => {
    const camera = controls.camera;
    if (ortho) return ((camera.right - camera.left) / camera.zoom) * 0.08;
    return controls.distance * 0.08;
  };

  let space = false;
  let hint = null;

  const onWheel = (event) => {
    if (!controls.enabled || !insideCanvas(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    dismissHint();
    const lineBased = event.deltaMode !== 0;
    const unit = lineBased ? 16 : 1;
    if (event.ctrlKey || event.metaKey || lineBased) {
      // Pinch on a trackpad arrives as ctrl + wheel. Line-based deltas only come from a mouse wheel.
      const scale = isFirefox ? 1 : 1 / 3;
      const delta = (event.deltaY * unit * scale) / (event.ctrlKey ? 2.5 : 10);
      zoomAt(delta, event.clientX, event.clientY);
      return;
    }
    // camera-controls' truck deltas are already in "scene follows the fingers" orientation.
    pan(event.deltaX * unit, event.deltaY * unit);
  };

  const onPointerDown = (event) => {
    if (!controls.enabled || !insideCanvas(event)) return;
    dismissHint();
    if (event.pointerType === 'touch' || event.button !== 0) return;
    const panning = space || event.shiftKey || topDown();
    controls.mouseButtons.left = panning ? ACTION.SCREEN_PAN : ACTION.ROTATE;
    if (event.shiftKey) event.stopImmediatePropagation();
    canvas.style.cursor = panning ? 'grabbing' : '';
  };
  const onPointerUp = () => {
    canvas.style.cursor = space ? 'grab' : '';
  };

  const onDoubleClick = (event) => {
    if (!controls.enabled || !insideCanvas(event)) return;
    const camera = controls.camera;
    const target = controls.getTarget(new Vector3());
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const near = new Vector3(x, y, -1).unproject(camera);
    const far = new Vector3(x, y, 1).unproject(camera);
    const direction = far.clone().sub(near);
    if (Math.abs(direction.y) < 1e-6) return;
    const t = (target.y - near.y) / direction.y;
    if (t < 0 || t > 1) return;
    const hit = near.addScaledVector(direction, t);
    controls.moveTo(hit.x, target.y, hit.z, true);
  };

  const onKeyDown = (event) => {
    if (typing(event) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === 'Space') {
      if (!space) {
        space = true;
        canvas.style.cursor = 'grab';
      }
      event.preventDefault();
      return;
    }
    const size = step();
    const turn = (15 * Math.PI) / 180;
    switch (event.key) {
      case 'ArrowLeft':
        event.shiftKey ? controls.rotate(-turn, 0, true) : controls.truck(-size, 0, true);
        break;
      case 'ArrowRight':
        event.shiftKey ? controls.rotate(turn, 0, true) : controls.truck(size, 0, true);
        break;
      case 'ArrowUp':
        event.shiftKey ? controls.rotate(0, -turn / 2, true) : controls.forward(size, true);
        break;
      case 'ArrowDown':
        event.shiftKey ? controls.rotate(0, turn / 2, true) : controls.forward(-size, true);
        break;
      case '+':
      case '=':
        ortho ? controls.zoom(controls.camera.zoom * 0.25, true) : controls.dolly(controls.distance * 0.2, true);
        break;
      case '-':
      case '_':
        ortho ? controls.zoom(-controls.camera.zoom * 0.2, true) : controls.dolly(-controls.distance * 0.25, true);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    dismissHint();
  };
  const onKeyUp = (event) => {
    if (event.code === 'Space') {
      space = false;
      canvas.style.cursor = '';
    }
  };
  const onBlur = () => {
    space = false;
    canvas.style.cursor = '';
  };

  function dismissHint() {
    if (!hint) return;
    hint.style.opacity = '0';
    const node = hint;
    hint = null;
    setTimeout(() => node.remove(), 400);
  }
  function showHint() {
    let shown = false;
    try {
      shown = sessionStorage.getItem(HINT_KEY) === '1';
      sessionStorage.setItem(HINT_KEY, '1');
    } catch {}
    if (shown || matchMedia('(pointer: coarse)').matches) return;
    const host = canvas.parentElement;
    if (!host) return;
    hint = document.createElement('div');
    hint.setAttribute('role', 'note');
    hint.style.cssText =
      'position:absolute;left:50%;bottom:84px;transform:translateX(-50%);z-index:30;pointer-events:none;' +
      'padding:8px 14px;border-radius:999px;background:rgba(23,23,23,.82);color:#f5f5f5;font:12px/1.5 system-ui,sans-serif;' +
      'letter-spacing:.01em;white-space:nowrap;box-shadow:0 6px 24px rgba(0,0,0,.25);transition:opacity .4s ease;backdrop-filter:blur(8px)';
    hint.textContent = 'Drag to orbit · Scroll to pan · Pinch to zoom · Double-click to centre · Arrow keys to move';
    host.appendChild(hint);
    setTimeout(dismissHint, 9000);
  }
  showHint();

  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('dblclick', onDoubleClick, true);
  // Capture phase: Pascal's own shortcut handlers stop propagation at the document.
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);

  return () => {
    window.removeEventListener('wheel', onWheel, { capture: true });
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    window.removeEventListener('dblclick', onDoubleClick, true);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
    controls.dollyToCursor = previousDollyToCursor;
    if (globalThis.__pascalTrackpadControls === controls) delete globalThis.__pascalTrackpadControls;
    canvas.style.cursor = '';
    dismissHint();
  };
}
