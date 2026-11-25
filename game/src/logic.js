// Lantern Kitchen — logic: movement, collisions, every station interaction,
// cooking, orders, scoring, rush hour, and the end of the day.

function lkStationCenter(st) {
  return { x: st.x + st.w / 2, y: st.y + st.h / 2 };
}

// Distance from a point to the nearest point of a station's rectangle.
// Wide stations (the plating counter) must be usable from their edge,
// not only from their centre.
function lkDistToStation(st, x, y) {
  const cx = Math.max(st.x, Math.min(x, st.x + st.w));
  const cy = Math.max(st.y, Math.min(y, st.y + st.h));
  return Math.hypot(x - cx, y - cy);
}

function lkNearestStation(state, x, y, maxDist) {
  let best = null;
  let bestD = maxDist || Infinity;
  for (const id of Object.keys(state.stations)) {
    const st = state.stations[id];
    const d = lkDistToStation(st, x, y);
    if (d < bestD) { bestD = d; best = st; }
  }
  return best;
}

function lkCollides(x, y, state) {
  // Stay inside the kitchen floor and out of station rectangles.
  const r = LK.PLAYER_RADIUS;
  if (x < 16 + r || x > LK.CANVAS_W - 16 - r) return true;
  if (y < LK.TOP_BAR_H + 8 + r || y > LK.CANVAS_H - 12 - r) return true;
  for (const id of Object.keys(state.stations)) {
    const st = state.stations[id];
    const pad = r - 4;
    if (x > st.x - pad && x < st.x + st.w + pad &&
        y > st.y - pad && y < st.y + st.h + pad) return true;
  }
  return false;
}

function lkMovePlayer(state, dt) {
  const p = state.player;
  const mv = LKInput.moveVector();
  if (mv.x !== 0 || mv.y !== 0) {
    // Keyboard movement cancels a click-to-move target.
    p.tx = null; p.ty = null;
    const step = LK.PLAYER_SPEED * dt;
    const nx = p.x + mv.x * step;
    const ny = p.y + mv.y * step;
    if (!lkCollides(nx, p.y, state)) p.x = nx;
    if (!lkCollides(p.x, ny, state)) p.y = ny;
    p.moving = true;
    p.dir = mv.x !== 0 ? Math.sign(mv.x) : p.dir;
    p.bob += dt * 12;
  } else if (p.tx !== null && p.ty !== null) {
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      p.tx = null; p.ty = null;
      p.moving = false;
      // Arrived at a station: run the queued interaction.
      if (p.pendingStation) {
        const st = p.pendingStation;
        p.pendingStation = null;
        lkInteract(state, st);
      }
    } else {
      const step = Math.min(dist, LK.PLAYER_SPEED * dt);
      const nx = p.x + (dx / dist) * step;
      const ny = p.y + (dy / dist) * step;
      if (!lkCollides(nx, p.y, state)) p.x = nx;
      if (!lkCollides(p.x, ny, state)) p.y = ny;
      // If blocked on both axes, give up on the target.
      if (lkCollides(nx, p.y, state) && lkCollides(p.x, ny, state)) {
        p.tx = null; p.ty = null;
      }
      p.moving = true;
      p.dir = dx !== 0 ? Math.sign(dx) : p.dir;
      p.bob += dt * 12;
    }
  } else {
    p.moving = false;
  }
}

// --- Items -----------------------------------------------------------------

function lkItemName(item) {
  if (LK.COMPONENTS[item]) return LK.COMPONENTS[item].name;
  if (LK.INGREDIENTS[item]) return LK.INGREDIENTS[item].name;
  if (item === 'plate') return 'Plate';
  return item;
}

function lkItemColor(item) {
  if (LK.COMPONENTS[item]) return LK.COMPONENTS[item].color;
  if (LK.INGREDIENTS[item]) return LK.INGREDIENTS[item].color;
  return '#cccccc';
}

// A carried item is either a pantry ingredient id, a prepared component id,
// or 'plate:<dishId>' for a finished plate.
function lkIsPlate(item) {
  return typeof item === 'string' && item.indexOf('plate:') === 0;
}

function lkPlateDish(item) {
  return lkIsPlate(item) ? item.slice(6) : null;
}

function lkCarry(state, item) {
  if (state.player.carrying.length >= LK.MAX_HANDS) {
    lkHint(state, 'Hands full! Serve or bin something first.');
    LKSound.sfx.error();
    return false;
  }
  state.player.carrying.push(item);
  LKSound.sfx.pickup();
  return true;
}

function lkTakeCarried(state) {
  return state.player.carrying.pop() || null;
}

// --- Cooking ----------------------------------------------------------------

function lkCookTarget(item, stationKind) {
  // What does this station do to this item? Returns { result, seconds } or null.
  const ing = LK.INGREDIENTS[item];
  if (ing && ing.station === stationKind && ing.prep !== 'chop' && ing.prep !== 'none') {
    return { result: ing.result, seconds: ing.cookSeconds };
  }
  const key = item + ':' + stationKind;
  const t = LK.COOK_TRANSFORMS[key];
  if (t) return { result: t.result, seconds: t.cookSeconds };
  return null;
}

function lkCanChop(item) {
  const ing = LK.INGREDIENTS[item];
  return !!(ing && ing.prep === 'chop');
}

// --- Station interactions ---------------------------------------------------

function lkInteract(state, st) {
  const p = state.player;
  const c = lkStationCenter(st);
  switch (st.kind) {
    case 'pantry': {
      state.pantryOpen = !state.pantryOpen;
      LKSound.sfx.click();
      break;
    }
    case 'board': {
      if (!st.boardItem) {
        // Place something choppable from the hands.
        const idx = p.carrying.findIndex((it) => lkCanChop(it));
        if (idx < 0) {
          lkHint(state, 'Bring a raw ingredient to chop: meat, veg or egg.');
          LKSound.sfx.error();
          return;
        }
        const item = p.carrying.splice(idx, 1)[0];
        st.boardItem = {
          item,
          chops: 0,
          chopsNeeded: LK.INGREDIENTS[item].chopTurns,
        };
        LKSound.sfx.place();
      } else if (st.boardItem.chops < st.boardItem.chopsNeeded) {
        st.boardItem.chops++;
        LKSound.sfx.chop();
        lkChopBits(state, c.x, c.y - 6, lkItemColor(st.boardItem.item));
        if (st.boardItem.chops >= st.boardItem.chopsNeeded) {
          st.boardItem.item = LK.INGREDIENTS[st.boardItem.item].result;
          LKSound.sfx.chopDone();
          lkHint(state, lkItemName(st.boardItem.item) + ' ready — pick it up!');
        }
      } else {
        // Pick the chopped result up.
        if (lkCarry(state, st.boardItem.item)) st.boardItem = null;
      }
      break;
    }
    case 'stove':
    case 'grill':
    case 'steamer': {
      const kind = st.kind;
      // Find a slot to use: a done slot first (pick up), then an empty slot.
      let slot = st.cookSlots.find((s) => s.item && s.done);
      let action = 'pickup';
      if (!slot) {
        slot = st.cookSlots.find((s) => !s.item);
        action = 'place';
      }
      if (!slot) {
        if (st.cookSlots.some((s) => s.item && !s.done)) {
          lkHint(state, 'Still cooking — give it a moment.');
        } else {
          lkHint(state, 'No free burner here.');
        }
        LKSound.sfx.error();
        return;
      }
      if (action === 'pickup') {
        if (lkCarry(state, slot.item)) {
          slot.item = null; slot.progress = 0; slot.needed = 0; slot.done = false; slot.burnIn = 0;
        }
        return;
      }
      // Place: the top carried item the station can cook wins.
      let idx = -1;
      let target = null;
      for (let i = p.carrying.length - 1; i >= 0; i--) {
        const t = lkCookTarget(p.carrying[i], kind);
        if (t) { idx = i; target = t; break; }
      }
      if (idx < 0) {
        lkHint(state, kind === 'stove' ? 'The stove takes noodles, rice or chopped veg.'
          : kind === 'grill' ? 'The grill takes meat.'
          : 'The steamer takes dough.');
        LKSound.sfx.error();
        return;
      }
      const item = p.carrying.splice(idx, 1)[0];
      slot.item = item;
      slot.progress = 0;
      slot.needed = target.seconds;
      slot.done = false;
      slot.burnIn = 0;
      slot.result = target.result;
      LKSound.sfx.place();
      break;
    }
    case 'plating': {
      const plate = st.plate;
      const top = p.carrying[p.carrying.length - 1];
      if (top && !lkIsPlate(top) && plate.components.length < LK.PLATE_MAX_COMPONENTS) {
        // Add a component to the plate if some recipe can still hold it.
        const trial = plate.components.concat([top]);
        const fits = LK.RECIPE_IDS.some((rid) => {
          const need = LK.RECIPES[rid].components;
          return trial.every((c) => need.includes(c)) &&
            trial.length <= need.length &&
            trial.filter((c) => c === top).length <= need.filter((c) => c === top).length;
        });
        if (!fits) {
          lkHint(state, lkItemName(top) + ' does not belong in any dish with this plate.');
          LKSound.sfx.error();
          return;
        }
        p.carrying.pop();
        plate.components.push(top);
        LKSound.sfx.place();
        // Completed?
        const rid = LK.RECIPE_IDS.find((id) => {
          const need = LK.RECIPES[id].components.slice().sort().join('|');
          return plate.components.slice().sort().join('|') === need;
        });
        if (rid) {
          plate.dish = rid;
          LKSound.sfx.ding();
          lkSparkle(state, c.x, c.y - 10);
          lkHint(state, LK.RECIPES[rid].name + ' is ready — serve it!');
        }
        return;
      }
      if (plate.dish && p.carrying.length < LK.MAX_HANDS) {
        // Pick the finished plate up.
        p.carrying.push('plate:' + plate.dish);
        st.plate = { components: [] };
        LKSound.sfx.pickup();
        return;
      }
      if (plate.components.length > 0 && p.carrying.length < LK.MAX_HANDS) {
        // Take the last component back off the plate.
        p.carrying.push(plate.components.pop());
        LKSound.sfx.pickup();
        return;
      }
      if (plate.components.length === 0 && !plate.dish) {
        lkHint(state, 'Bring cooked components here to build a dish.');
        LKSound.sfx.error();
      }
      break;
    }
    case 'window': {
      const idx = p.carrying.findIndex((it) => lkIsPlate(it));
      if (idx < 0) {
        lkHint(state, 'Bring a finished plate to the window.');
        LKSound.sfx.error();
        return;
      }
      const dish = lkPlateDish(p.carrying[idx]);
      const orderIdx = state.orders.findIndex((o) => o.dish === dish);
      if (orderIdx < 0) {
        lkHint(state, 'No ticket is waiting for ' + LK.RECIPES[dish].name + ' right now.');
        LKSound.sfx.error();
        return;
      }
      lkServe(state, orderIdx, idx, c);
      break;
    }
    case 'trash': {
      const item = lkTakeCarried(state);
      if (!item) {
        lkHint(state, 'Nothing in hand to throw away.');
        LKSound.sfx.error();
        return;
      }
      LKSound.sfx.trash();
      lkFloat(state, c.x, c.y - 20, 'binned', '#b9c4cc');
      break;
    }
    default:
      break;
  }
}

function lkServe(state, orderIdx, carryIdx, windowCenter) {
  const order = state.orders[orderIdx];
  const dish = LK.RECIPES[order.dish];
  const patienceLeft = Math.max(0, order.patience / order.maxPatience);
  const tip = Math.round(patienceLeft * LK.TIP_MAX);
  const comboMult = 1 + Math.min(state.combo, 4) * 0.1;
  const earned = Math.round((dish.price + tip) * comboMult);
  state.coins += earned;
  state.served++;
  state.combo++;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.comboTimer = LK.COMBO_WINDOW;
  state.orders.splice(orderIdx, 1);
  state.player.carrying.splice(carryIdx, 1);
  LKSound.sfx.serve();
  lkSparkle(state, windowCenter.x, windowCenter.y - 10);
  lkFloat(state, windowCenter.x, windowCenter.y - 30, '+' + earned + ' coins', '#ffc93c');
  if (tip >= 8) lkFloat(state, windowCenter.x, windowCenter.y - 52, 'Speedy tip!', '#7bc96f');
}

// --- Click handling ----------------------------------------------------------

function lkPantryPickerHit(state, x, y) {
  // The picker is a row of ingredient buttons at the bottom of the screen.
  if (!state.pantryOpen) return null;
  const n = LK.PANTRY_ORDER.length;
  const bw = 74, bh = 64, gap = 10;
  const totalW = n * bw + (n - 1) * gap;
  const x0 = (LK.CANVAS_W - totalW) / 2;
  const y0 = LK.CANVAS_H - 84;
  for (let i = 0; i < n; i++) {
    const bx = x0 + i * (bw + gap);
    if (x >= bx && x <= bx + bw && y >= y0 && y <= y0 + bh) return LK.PANTRY_ORDER[i];
  }
  return null;
}

function lkHandleClick(state, x, y) {
  // Pantry picker first.
  const picked = lkPantryPickerHit(state, x, y);
  if (picked) {
    if (lkCarry(state, picked)) {
      state.pantryOpen = false;
      lkHint(state, LK.INGREDIENTS[picked].name + ' in hand.');
    }
    return;
  }
  if (state.pantryOpen) state.pantryOpen = false;

  // Clicking a station: walk to it, then interact.
  let best = null;
  let bestD = Infinity;
  for (const id of Object.keys(state.stations)) {
    const st = state.stations[id];
    if (x >= st.x - 8 && x <= st.x + st.w + 8 && y >= st.y - 8 && y <= st.y + st.h + 8) {
      const c = lkStationCenter(st);
      const d = Math.hypot(x - c.x, y - c.y);
      if (d < bestD) { bestD = d; best = st; }
    }
  }
  if (best) {
    const c = lkStationCenter(best);
    const p = state.player;
    // Close enough to reach the counter's edge: use it right away.
    if (lkDistToStation(best, p.x, p.y) <= LK.INTERACT_RANGE) {
      lkInteract(state, best);
    } else {
      // Walk to just outside the station, then interact on arrival.
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const n = Math.hypot(dx, dy) || 1;
      const standOff = Math.max(best.w, best.h) / 2 + LK.PLAYER_RADIUS + 14;
      p.tx = c.x + (dx / n) * standOff;
      p.ty = c.y + (dy / n) * standOff;
      p.pendingStation = best;
    }
    return;
  }
  // Clicking the floor: walk there.
  state.player.tx = x;
  state.player.ty = y;
  state.player.pendingStation = null;
}

// --- Update ------------------------------------------------------------------

function lkUpdate(state, dt) {
  if (state.mode !== 'playing') return;
  state.time += dt;
  state.timeLeft = Math.max(0, LK.DAY_LENGTH - state.time);

  // Day timer ticks.
  const sec = Math.floor(state.timeLeft);
  if (sec !== state.lastTickSecond) {
    state.lastTickSecond = sec;
    if (sec <= 10 && sec > 0) LKSound.sfx.tick();
  }

  // Rush hour.
  state.rushTimer -= dt;
  if (state.rushLeft > 0) {
    state.rushLeft -= dt;
    if (state.rushLeft <= 0) lkBanner(state, 'Rush over — breathe!');
  } else if (state.rushTimer <= 0) {
    state.rushLeft = LK.RUSH_LENGTH;
    state.rushTimer = LK.RUSH_EVERY;
    lkBanner(state, 'RUSH HOUR! Tickets are flying in!');
    LKSound.sfx.rush();
  }

  // Orders spawn.
  state.orderTimer -= dt;
  if (state.orderTimer <= 0) {
    if (lkSpawnOrder(state)) {
      state.orderTimer = lkOrderInterval(state);
    } else {
      state.orderTimer = 2; // board full: try again soon
    }
  }

  // Order patience drains; missed tickets cost a heart.
  for (let i = state.orders.length - 1; i >= 0; i--) {
    const o = state.orders[i];
    o.patience -= dt;
    if (o.patience <= 0) {
      state.orders.splice(i, 1);
      state.missed++;
      state.hearts--;
      state.combo = 0;
      state.comboTimer = 0;
      LKSound.sfx.burn();
      lkBanner(state, 'A ticket expired — a guest walked out!');
      if (state.hearts <= 0) {
        lkEndDay(state, false);
        return;
      }
    }
  }

  // Combo decay.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  // Cooking progress.
  let anyCooking = false;
  for (const id of Object.keys(state.stations)) {
    const st = state.stations[id];
    for (const slot of st.cookSlots) {
      if (!slot.item) continue;
      if (!slot.done) {
        anyCooking = true;
        slot.progress += dt;
        if (Math.random() < dt * 6) {
          const c = lkStationCenter(st);
          lkSteam(state, c.x + (Math.random() - 0.5) * 60, c.y - 10, 1);
        }
        if (slot.progress >= slot.needed) {
          slot.done = true;
          slot.item = slot.result;
          slot.burnIn = LK.BURN_GRACE;
          LKSound.sfx.ding();
          const c = lkStationCenter(st);
          lkFloat(state, c.x, c.y - 30, lkItemName(slot.item) + ' ready!', '#7bc96f');
        }
      } else if (slot.item === 'burnt') {
        // Burnt food sits on the burner until the chef picks it up and bins it.
      } else {
        slot.burnIn -= dt;
        if (Math.random() < dt * 4) {
          const c = lkStationCenter(st);
          lkSteam(state, c.x + (Math.random() - 0.5) * 60, c.y - 10, 1);
        }
        if (slot.burnIn <= 0) {
          // Burnt: stays done so it never re-cooks (needed is 0 by now),
          // and the chef must pick it up and bin it.
          slot.item = 'burnt';
          slot.done = true;
          slot.burnIn = 0;
          slot.result = null;
          LKSound.sfx.burn();
          const c = lkStationCenter(st);
          lkFloat(state, c.x, c.y - 30, 'Burnt!', '#d9534f');
        }
      }
    }
  }
  if (anyCooking && !state.sizzling) { LKSound.sizzleStart(); state.sizzling = true; }
  if (!anyCooking && state.sizzling) { LKSound.sizzleStop(); state.sizzling = false; }

  // Movement and clicks.
  lkMovePlayer(state, dt);
  const click = LKInput.takeClick();
  if (click) lkHandleClick(state, click.x, click.y);
  const key = LKInput.takeKeyPress();
  if (key === 'interact') {
    const st = lkNearestStation(state, state.player.x, state.player.y, LK.INTERACT_RANGE);
    if (st) lkInteract(state, st);
  } else if (key === 'drop') {
    const st = lkNearestStation(state, state.player.x, state.player.y, LK.INTERACT_RANGE);
    if (st && st.kind === 'trash') lkInteract(state, st);
    else if (state.player.carrying.length > 0) {
      const item = state.player.carrying.pop();
      lkFloat(state, state.player.x, state.player.y - 34, lkItemName(item) + ' dropped', '#b9c4cc');
    }
  } else if (key === 'mute') {
    state.muted = !state.muted;
    LKSound.setMuted(state.muted);
  } else if (key === 'pause') {
    state.mode = 'paused';
  }

  // Particles, floats, hints, banners.
  lkUpdateFx(state, dt);

  // Day over?
  if (state.timeLeft <= 0) lkEndDay(state, true);
}

function lkUpdateFx(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.life -= dt;
    if (pt.life <= 0) { state.particles.splice(i, 1); continue; }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += (pt.gravity || 0) * dt;
    if (pt.kind === 'steam') pt.size += dt * 6;
  }
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i];
    f.life -= dt;
    f.y -= 26 * dt;
    if (f.life <= 0) state.floats.splice(i, 1);
  }
  for (let i = state.hints.length - 1; i >= 0; i--) {
    state.hints[i].life -= dt;
    if (state.hints[i].life <= 0) state.hints.splice(i, 1);
  }
  if (state.banner) {
    state.banner.life -= dt;
    if (state.banner.life <= 0) state.banner = null;
  }
}

function lkEndDay(state, finished) {
  state.mode = 'dayover';
  LKSound.sizzleStop();
  state.sizzling = false;
  const won = state.coins >= LK.TARGET_COINS;
  const stars = state.coins >= LK.TARGET_COINS ? 3
    : state.coins >= Math.round(LK.TARGET_COINS * 0.65) ? 2
    : state.coins >= Math.round(LK.TARGET_COINS * 0.35) ? 1 : 0;
  state.stars = stars;
  state.result = {
    coins: state.coins,
    served: state.served,
    missed: state.missed,
    bestCombo: state.bestCombo,
    stars,
    won,
    finished,
  };
  if (won) LKSound.sfx.serve();
}

function lkStartDay(state) {
  const fresh = lkNewState();
  fresh.mode = 'playing';
  state.mode = fresh.mode;
  state.time = 0;
  state.timeLeft = LK.DAY_LENGTH;
  state.coins = 0;
  state.served = 0;
  state.missed = 0;
  state.hearts = LK.MAX_HEARTS;
  state.combo = 0;
  state.comboTimer = 0;
  state.bestCombo = 0;
  state.orders = [];
  state.nextOrderId = 1;
  state.orderTimer = LK.ORDER_FIRST_DELAY;
  state.ordersSpawned = 0;
  state.rushTimer = LK.RUSH_EVERY;
  state.rushLeft = 0;
  state.player = fresh.player;
  state.stations = fresh.stations;
  state.pantryOpen = false;
  state.particles = [];
  state.floats = [];
  state.hints = [];
  state.banner = null;
  state.lastTickSecond = -1;
  state.result = null;
  state.stars = 0;
  lkBanner(state, 'Service starts! First tickets in a moment.');
}
