// Lantern Kitchen — state: one object holds the whole game, so a demo shot
// or a restart can build a fresh state with the same shape.

function lkNewState() {
  const stations = {};
  for (const s of LK.STATIONS) {
    stations[s.id] = {
      id: s.id, name: s.name, kind: s.kind,
      x: s.x, y: s.y, w: s.w, h: s.h,
      slots: (s.slots || 1),
      // Board: { item, chops, chopsNeeded }. Cookers: array of slots.
      boardItem: null,
      cookSlots: [],
      // Plating: { components: [] } or null when the counter holds no plate.
      plate: { components: [] },
    };
    if (s.kind === 'stove' || s.kind === 'grill' || s.kind === 'steamer') {
      for (let i = 0; i < (s.slots || 1); i++) {
        stations[s.id].cookSlots.push({ item: null, progress: 0, needed: 0, done: false, burnIn: 0 });
      }
    }
  }

  return {
    mode: 'title', // title | playing | paused | dayover
    time: 0, // seconds since the day started
    timeLeft: LK.DAY_LENGTH,
    coins: 0,
    served: 0,
    missed: 0,
    hearts: LK.MAX_HEARTS,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    orders: [], // { id, dish, patience, maxPatience, born }
    nextOrderId: 1,
    orderTimer: LK.ORDER_FIRST_DELAY,
    ordersSpawned: 0,
    rushTimer: LK.RUSH_EVERY,
    rushLeft: 0,
    player: {
      x: LK.CANVAS_W / 2, y: 420,
      tx: null, ty: null, // click-to-move target
      dir: 1, moving: false,
      carrying: [], // item ids, max LK.MAX_HANDS
      bob: 0,
    },
    stations,
    pantryOpen: false,
    particles: [], // { x, y, vx, vy, life, maxLife, color, size, kind }
    floats: [], // { x, y, text, color, life, maxLife }
    hints: [], // { text, life }
    banner: null, // { text, life, maxLife }
    frozen: false, // shot states freeze the clock (screenshots only)
    lastTickSecond: -1,
    sizzling: false,
    muted: false,
    stars: 0,
    result: null, // { coins, served, missed, bestCombo, stars, won }
  };
}

// --- Orders ----------------------------------------------------------------

function lkSpawnOrder(state) {
  if (state.orders.length >= LK.MAX_ORDERS) return null;
  const dish = LK.RECIPE_IDS[Math.floor(Math.random() * LK.RECIPE_IDS.length)];
  const patience = Math.max(
    LK.ORDER_PATIENCE_MIN,
    LK.ORDER_PATIENCE_START - state.ordersSpawned * 1.5,
  );
  const order = {
    id: state.nextOrderId++,
    dish,
    patience,
    maxPatience: patience,
    born: state.time,
  };
  state.orders.push(order);
  state.ordersSpawned++;
  return order;
}

function lkOrderInterval(state) {
  if (state.rushLeft > 0) return LK.RUSH_INTERVAL;
  return Math.max(
    LK.ORDER_INTERVAL_MIN,
    LK.ORDER_INTERVAL_START - state.ordersSpawned * LK.ORDER_INTERVAL_STEP,
  );
}

// --- Particles and floating text -------------------------------------------

function lkAddParticle(state, p) {
  if (state.particles.length > 320) state.particles.shift();
  state.particles.push({
    x: p.x, y: p.y,
    vx: p.vx || 0, vy: p.vy || 0,
    life: p.life || 0.7, maxLife: p.life || 0.7,
    color: p.color || '#ffffff', size: p.size || 3,
    kind: p.kind || 'dot', gravity: p.gravity || 0,
  });
}

function lkSteam(state, x, y, n) {
  for (let i = 0; i < (n || 2); i++) {
    lkAddParticle(state, {
      x: x + (Math.random() - 0.5) * 26, y: y - 6,
      vx: (Math.random() - 0.5) * 8, vy: -22 - Math.random() * 14,
      life: 0.9 + Math.random() * 0.5, color: 'rgba(255,255,255,0.75)',
      size: 5 + Math.random() * 5, kind: 'steam',
    });
  }
}

function lkChopBits(state, x, y, color) {
  for (let i = 0; i < 8; i++) {
    lkAddParticle(state, {
      x, y,
      vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80,
      life: 0.5 + Math.random() * 0.3, color,
      size: 3 + Math.random() * 3, kind: 'dot', gravity: 320,
    });
  }
}

function lkSparkle(state, x, y) {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    lkAddParticle(state, {
      x, y,
      vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
      life: 0.5, color: '#ffc93c', size: 3, kind: 'star',
    });
  }
}

function lkFloat(state, x, y, text, color) {
  state.floats.push({ x, y, text, color: color || '#ffc93c', life: 1.4, maxLife: 1.4 });
}

function lkHint(state, text) {
  state.hints = [{ text, life: 2.6 }];
}

function lkBanner(state, text) {
  state.banner = { text, life: 2.4, maxLife: 2.4 };
}
