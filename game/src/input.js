// Lantern Kitchen — input: keyboard movement, click-to-move, and clicks on
// stations. Input only records intent; logic.js decides what it means.

const LKInput = (() => {
  const keys = {};
  let click = null; // { x, y } in canvas coordinates, consumed by logic
  let keyPress = null; // single-press action key, consumed by logic
  let canvas = null;
  let scale = 1;

  function canvasPos(evt) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - r.left) * (LK.CANVAS_W / r.width),
      y: (evt.clientY - r.top) * (LK.CANVAS_H / r.height),
    };
  }

  function attach(c, handlers) {
    canvas = c;
    scale = 1;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
      if (k === 'e' || k === ' ') keyPress = 'interact';
      if (k === 'q') keyPress = 'drop';
      if (k === 'm') keyPress = 'mute';
      if (k === 'p' || k === 'escape') keyPress = 'pause';
      if (k === 'r') keyPress = 'restart';
      if (k === 'enter') keyPress = 'confirm';
      if (handlers && handlers.onKey) handlers.onKey(k);
    });
    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });
    canvas.addEventListener('pointerdown', (e) => {
      const p = canvasPos(e);
      click = p;
      LKSound.unlock();
      if (handlers && handlers.onPointer) handlers.onPointer(p);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function moveVector() {
    let x = 0, y = 0;
    if (keys['a'] || keys['arrowleft']) x -= 1;
    if (keys['d'] || keys['arrowright']) x += 1;
    if (keys['w'] || keys['arrowup']) y -= 1;
    if (keys['s'] || keys['arrowdown']) y += 1;
    if (x !== 0 && y !== 0) {
      const n = Math.hypot(x, y);
      x /= n; y /= n;
    }
    return { x, y };
  }

  function takeClick() {
    const c = click;
    click = null;
    return c;
  }

  function takeKeyPress() {
    const k = keyPress;
    keyPress = null;
    return k;
  }

  function peekClick() { return click; }

  // Drop any pending input (used when a screen changes, so a stale click
  // cannot leak into the next screen's first frame).
  function reset() {
    click = null;
    keyPress = null;
  }

  return { attach, moveVector, takeClick, takeKeyPress, peekClick, reset };
})();
