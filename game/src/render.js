// Lantern Kitchen — render: everything on the canvas is drawn here with
// vector shapes, so the game needs no image files at all.

function lkRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lkText(ctx, text, x, y, size, color, align, weight) {
  ctx.fillStyle = color || '#2e2118';
  ctx.font = (weight || 'bold') + ' ' + size + 'px Trebuchet MS, Verdana, sans-serif';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// --- Ingredient icons ------------------------------------------------------

function lkDrawIngredientIcon(ctx, item, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  const color = lkItemColor(item);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.stroke();
  ctx.fillStyle = '#2e2118';
  ctx.font = 'bold ' + Math.max(11, r) + 'px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = {
    noodles: '≋', rice: '∴', dough: '◐', meat: '♥', veg: '✿',
    egg: '○', sauce: '♦', 'boiled-noodles': '≋', 'steamed-rice': '∴',
    dumpling: '◐', 'chopped-meat': '♥', 'chopped-veg': '✿', 'chopped-egg': '○',
    'grilled-meat': '♥', 'stir-veg': '✿', burnt: '✖',
  }[item] || '?';
  ctx.fillText(glyph, 0, 1);
  if (item === 'grilled-meat' || item === 'stir-veg') {
    // A little flame / wok mark for cooked items.
    ctx.fillStyle = '#e8912d';
    ctx.font = 'bold ' + Math.max(9, r * 0.7) + 'px Trebuchet MS, sans-serif';
    ctx.fillText('▲', r * 0.62, -r * 0.62);
  }
  ctx.restore();
}

function lkDrawPlateIcon(ctx, x, y, r, dishId) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e1';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#c0392b';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = dishId ? LK.RECIPES[dishId].color : '#e8d5a8';
  ctx.fill();
  if (dishId) {
    ctx.fillStyle = '#2e2118';
    ctx.font = 'bold ' + Math.max(10, r * 0.55) + 'px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 1);
  }
  ctx.restore();
}

// --- Stations ---------------------------------------------------------------

function lkDrawStation(ctx, state, st) {
  const C = LK.COLORS;
  const c = lkStationCenter(st);
  const isBoard = st.kind === 'board';
  const isCooker = st.kind === 'stove' || st.kind === 'grill' || st.kind === 'steamer';

  // Counter body.
  ctx.save();
  lkRoundRect(ctx, st.x, st.y, st.w, st.h, 12);
  ctx.fillStyle = C.counterWood;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.counterEdge;
  ctx.stroke();
  // Counter top.
  lkRoundRect(ctx, st.x + 4, st.y + 4, st.w - 8, 26, 8);
  ctx.fillStyle = st.kind === 'window' ? '#f5f0e1' : C.counterTop;
  ctx.fill();

  // Name plate.
  lkText(ctx, st.name, c.x, st.y + 17, 13, '#2e2118', 'center', 'bold');

  if (st.kind === 'pantry') {
    // Little jars on the shelf.
    const items = ['noodles', 'rice', 'dough', 'meat', 'veg', 'egg', 'sauce'];
    items.forEach((it, i) => {
      const ix = st.x + 22 + i * 26;
      const iy = st.y + 58;
      ctx.beginPath();
      ctx.arc(ix, iy, 10, 0, Math.PI * 2);
      ctx.fillStyle = lkItemColor(it);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.stroke();
    });
    lkText(ctx, 'click to open', c.x, st.y + 80, 11, '#5d3620', 'center', 'bold');
  }

  if (isBoard) {
    // Wooden board with the item on it.
    lkRoundRect(ctx, c.x - 62, st.y + 38, 124, 40, 8);
    ctx.fillStyle = '#e8c88f';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#b98a5e';
    ctx.stroke();
    if (st.boardItem) {
      lkDrawIngredientIcon(ctx, st.boardItem.item, c.x, st.y + 58, 14);
      const done = st.boardItem.chops >= st.boardItem.chopsNeeded;
      // Chop progress pips.
      for (let i = 0; i < st.boardItem.chopsNeeded; i++) {
        ctx.beginPath();
        ctx.arc(c.x - 22 + i * 22, st.y + 80, 5, 0, Math.PI * 2);
        ctx.fillStyle = i < st.boardItem.chops ? '#7bc96f' : 'rgba(0,0,0,0.25)';
        ctx.fill();
      }
      if (done) lkText(ctx, 'ready!', c.x, st.y + 80, 11, '#2e7d32', 'center', 'bold');
    } else {
      lkText(ctx, 'drop meat / veg / egg', c.x, st.y + 58, 11, '#6e4525', 'center', 'bold');
    }
  }

  if (isCooker) {
    // Burner circles, one per slot.
    const n = st.cookSlots.length;
    st.cookSlots.forEach((slot, i) => {
      const bx = n === 1 ? c.x : c.x - 44 + i * 88;
      const by = st.y + 58;
      ctx.beginPath();
      ctx.arc(bx, by, 26, 0, Math.PI * 2);
      ctx.fillStyle = slot.item ? '#3a2e28' : '#5d4030';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.steelDark;
      ctx.stroke();
      if (slot.item) {
        lkDrawIngredientIcon(ctx, slot.item, bx, by, 13);
        // Progress ring.
        const frac = slot.done ? 1 : Math.min(1, slot.progress / slot.needed);
        ctx.beginPath();
        ctx.arc(bx, by, 30, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.lineWidth = 5;
        ctx.strokeStyle = slot.done ? '#7bc96f' : '#ffc93c';
        ctx.stroke();
        if (slot.done && slot.item !== 'burnt') {
          lkText(ctx, 'DONE', bx, by - 34, 10, '#7bc96f', 'center', 'bold');
        }
        if (slot.item === 'burnt') {
          lkText(ctx, 'BURNT', bx, by - 34, 10, '#d9534f', 'center', 'bold');
        }
      } else {
        lkText(ctx, '—', bx, by, 14, '#8b98a3', 'center', 'bold');
      }
    });
  }

  if (st.kind === 'plating') {
    // The plate and its components.
    const px = c.x - 60;
    const py = st.y + 58;
    if (st.plate.dish) {
      lkDrawPlateIcon(ctx, px, py, 24, st.plate.dish);
      lkText(ctx, LK.RECIPES[st.plate.dish].name, c.x + 40, py - 12, 14, '#2e7d32', 'center', 'bold');
      lkText(ctx, 'click plate to pick up', c.x + 40, py + 10, 11, '#5d3620', 'center', 'bold');
    } else {
      ctx.beginPath();
      ctx.arc(px, py, 24, 0, Math.PI * 2);
      ctx.fillStyle = '#f5f0e1';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#c0392b';
      ctx.stroke();
      st.plate.components.forEach((comp, i) => {
        lkDrawIngredientIcon(ctx, comp, px - 14 + i * 14, py, 8);
      });
      const hint = st.plate.components.length === 0
        ? 'add cooked components'
        : st.plate.components.length + ' / 3 on the plate';
      lkText(ctx, hint, c.x + 60, py, 12, '#5d3620', 'center', 'bold');
      // Show the matching recipe, if the plate is part of one.
      const match = LK.RECIPE_IDS.find((rid) => {
        const need = LK.RECIPES[rid].components;
        return st.plate.components.length > 0 &&
          st.plate.components.every((cc) => need.includes(cc));
      });
      if (match) {
        lkText(ctx, '→ ' + LK.RECIPES[match].name, c.x + 60, py + 18, 11, '#2e7d32', 'center', 'bold');
      }
    }
  }

  if (st.kind === 'window') {
    // A warm serving hatch with a bell.
    ctx.beginPath();
    ctx.arc(c.x + 62, st.y + 56, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc93c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#b98a1e';
    ctx.stroke();
    lkText(ctx, 'ring to serve', c.x - 18, st.y + 58, 12, '#5d3620', 'center', 'bold');
    lkText(ctx, 'orders go here', c.x, st.y + 80, 11, '#6e4525', 'center', 'bold');
  }

  if (st.kind === 'trash') {
    lkRoundRect(ctx, c.x - 34, st.y + 36, 68, 34, 6);
    ctx.fillStyle = '#5d6d7e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3a4a5a';
    ctx.stroke();
    lkText(ctx, 'BIN', c.x, st.y + 53, 12, '#ffffff', 'center', 'bold');
  }

  ctx.restore();
}

// --- Order tickets ----------------------------------------------------------

function lkDrawOrders(ctx, state) {
  const C = LK.COLORS;
  const x0 = 16;
  const y0 = 10;
  const tw = 208, th = 72, gap = 10;
  state.orders.forEach((o, i) => {
    const x = x0 + i * (tw + gap);
    const y = y0;
    const recipe = LK.RECIPES[o.dish];
    const frac = Math.max(0, o.patience / o.maxPatience);
    const urgent = frac < 0.3;
    ctx.save();
    if (urgent && Math.floor(state.time * 4) % 2 === 0) {
      ctx.shadowColor = '#d9534f';
      ctx.shadowBlur = 12;
    }
    lkRoundRect(ctx, x, y, tw, th, 10);
    ctx.fillStyle = C.ticket;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = urgent ? '#d9534f' : C.ticketEdge;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Dish colour tab.
    lkRoundRect(ctx, x, y, 10, th, 10);
    ctx.fillStyle = recipe.color;
    ctx.fill();
    // Dish name and price.
    lkText(ctx, recipe.name, x + 20, y + 16, 14, '#2e2118', 'left', 'bold');
    lkText(ctx, '$' + recipe.price, x + tw - 10, y + 16, 13, '#2e7d32', 'right', 'bold');
    // Component dots.
    recipe.components.forEach((comp, j) => {
      lkDrawIngredientIcon(ctx, comp, x + 30 + j * 26, y + 42, 10);
    });
    // Patience bar.
    lkRoundRect(ctx, x + 16, y + 60, tw - 32, 7, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    lkRoundRect(ctx, x + 16, y + 60, (tw - 32) * frac, 7, 3);
    ctx.fillStyle = urgent ? '#d9534f' : frac < 0.55 ? '#e8912d' : '#7bc96f';
    ctx.fill();
    ctx.restore();
  });
  if (state.orders.length === 0) {
    lkText(ctx, 'No tickets yet — the first guests are on their way…',
      x0 + 4, y0 + th / 2, 14, 'rgba(255,243,214,0.85)', 'left', 'bold');
  }
}

// --- HUD ----------------------------------------------------------------------

function lkDrawHud(ctx, state) {
  const C = LK.COLORS;
  const x0 = 900;
  const y0 = 10;
  // Coins.
  ctx.save();
  lkRoundRect(ctx, x0, y0, 150, 34, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x0 + 20, y0 + 17, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#ffc93c';
  ctx.fill();
  lkText(ctx, '$', x0 + 20, y0 + 18, 13, '#7c5a00', 'center', 'bold');
  lkText(ctx, String(state.coins), x0 + 40, y0 + 18, 18, '#fff3d6', 'left', 'bold');
  // Day timer.
  lkRoundRect(ctx, x0, y0 + 40, 150, 34, 9);
  ctx.fillStyle = state.timeLeft <= 30 ? 'rgba(217,83,79,0.55)' : 'rgba(0,0,0,0.35)';
  ctx.fill();
  const mm = Math.floor(state.timeLeft / 60);
  const ss = Math.floor(state.timeLeft % 60);
  lkText(ctx, '⏱ ' + mm + ':' + String(ss).padStart(2, '0'), x0 + 75, y0 + 58, 17, '#fff3d6', 'center', 'bold');
  // Hearts.
  lkRoundRect(ctx, x0 + 160, y0, 104, 34, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  for (let i = 0; i < LK.MAX_HEARTS; i++) {
    lkText(ctx, i < state.hearts ? '♥' : '♡', x0 + 182 + i * 30, y0 + 18, 18,
      i < state.hearts ? '#ff6b6b' : 'rgba(255,255,255,0.4)', 'center', 'bold');
  }
  // Combo.
  lkRoundRect(ctx, x0 + 160, y0 + 40, 104, 34, 9);
  ctx.fillStyle = state.combo >= 2 ? 'rgba(255,201,60,0.5)' : 'rgba(0,0,0,0.35)';
  ctx.fill();
  lkText(ctx, state.combo >= 2 ? 'COMBO ×' + state.combo : 'combo —', x0 + 212, y0 + 58, 14,
    state.combo >= 2 ? '#2e2118' : '#fff3d6', 'center', 'bold');
  ctx.restore();
}

// --- Player -------------------------------------------------------------------

function lkDrawPlayer(ctx, state) {
  const p = state.player;
  const C = LK.COLORS;
  const bob = p.moving ? Math.sin(p.bob) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.3);
  // Shadow.
  ctx.beginPath();
  ctx.ellipse(0, 16, 18, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  // Body (apron).
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fillStyle = C.chefShirt;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 4, 11, 0, Math.PI);
  ctx.fillStyle = C.chefApron;
  ctx.fill();
  // Face.
  ctx.beginPath();
  ctx.arc(3 * p.dir, -3, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#2e2118';
  ctx.fill();
  // Chef hat.
  ctx.beginPath();
  ctx.ellipse(0, -16, 14, 8, 0, Math.PI, 0);
  ctx.fillStyle = C.chefHat;
  ctx.fill();
  lkRoundRect(ctx, -12, -18, 24, 6, 3);
  ctx.fillStyle = C.chefHat;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.stroke();
  ctx.restore();
  // Carried items float above the chef.
  p.carrying.forEach((item, i) => {
    const ix = p.x - (p.carrying.length - 1) * 14 + i * 28;
    const iy = p.y - 34 + bob * 0.3;
    if (lkIsPlate(item)) {
      lkDrawPlateIcon(ctx, ix, iy, 13, lkPlateDish(item));
    } else {
      lkDrawIngredientIcon(ctx, item, ix, iy, 12);
    }
  });
}

// --- Overlays -----------------------------------------------------------------

function lkDrawPantryPicker(ctx, state) {
  if (!state.pantryOpen) return;
  const n = LK.PANTRY_ORDER.length;
  const bw = 74, bh = 64, gap = 10;
  const totalW = n * bw + (n - 1) * gap;
  const x0 = (LK.CANVAS_W - totalW) / 2;
  const y0 = LK.CANVAS_H - 84;
  ctx.save();
  lkRoundRect(ctx, x0 - 12, y0 - 34, totalW + 24, bh + 46, 12);
  ctx.fillStyle = 'rgba(46,33,24,0.92)';
  ctx.fill();
  lkText(ctx, 'PANTRY — click an ingredient to take it', LK.CANVAS_W / 2, y0 - 18, 13, '#fff3d6', 'center', 'bold');
  LK.PANTRY_ORDER.forEach((id, i) => {
    const bx = x0 + i * (bw + gap);
    lkRoundRect(ctx, bx, y0, bw, bh, 9);
    ctx.fillStyle = '#fff8e7';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d9c48f';
    ctx.stroke();
    lkDrawIngredientIcon(ctx, id, bx + bw / 2, y0 + 22, 13);
    lkText(ctx, LK.INGREDIENTS[id].name, bx + bw / 2, y0 + 48, 11, '#2e2118', 'center', 'bold');
  });
  ctx.restore();
}

function lkDrawFx(ctx, state) {
  for (const pt of state.particles) {
    const a = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = pt.kind === 'steam' ? a * 0.6 : a;
    if (pt.kind === 'star') {
      lkText(ctx, '✦', pt.x, pt.y, pt.size * 3, pt.color, 'center', 'bold');
    } else {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
    }
    ctx.restore();
  }
  for (const f of state.floats) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    lkText(ctx, f.text, f.x, f.y, 17, f.color, 'center', 'bold');
    ctx.restore();
  }
}

function lkDrawBanner(ctx, state) {
  if (!state.banner) return;
  // Fade in over the first 0.2 s, fade out over the last 0.5 s.
  const age = state.banner.maxLife - state.banner.life;
  const a = Math.min(1, age / 0.2, state.banner.life / 0.5);
  ctx.save();
  ctx.globalAlpha = Math.max(0, a);
  lkRoundRect(ctx, (LK.CANVAS_W - 520) / 2, 108, 520, 44, 12);
  ctx.fillStyle = 'rgba(46,33,24,0.9)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffc93c';
  ctx.stroke();
  lkText(ctx, state.banner.text, LK.CANVAS_W / 2, 131, 18, '#ffc93c', 'center', 'bold');
  ctx.restore();
}

function lkDrawHint(ctx, state) {
  if (state.hints.length === 0) return;
  const h = state.hints[0];
  ctx.save();
  ctx.globalAlpha = Math.min(1, h.life);
  // Above the plating counter, below the rug: the one strip of floor
  // where a centred line never covers a station.
  lkText(ctx, h.text, LK.CANVAS_W / 2, 540, 15, '#fff3d6', 'center', 'bold');
  ctx.restore();
}

function lkDrawFloor(ctx, state) {
  const C = LK.COLORS;
  // Top bar.
  ctx.fillStyle = C.topBar;
  ctx.fillRect(0, 0, LK.CANVAS_W, LK.TOP_BAR_H);
  // Floor tiles, with a deterministic scatter of darker accent tiles so
  // the floor reads as worn kitchen tile rather than a flat fill.
  const ts = 64;
  for (let y = LK.TOP_BAR_H; y < LK.CANVAS_H; y += ts) {
    for (let x = 0; x < LK.CANVAS_W; x += ts) {
      const accent = ((x * 7 + y * 13) % 11) === 0;
      ctx.fillStyle = accent ? '#96683f'
        : ((x / ts + y / ts) % 2 === 0) ? C.floorA : C.floorB;
      ctx.fillRect(x, y, ts, ts);
    }
  }
  // A rug in the middle of the kitchen.
  lkRoundRect(ctx, 300, 250, 680, 240, 16);
  ctx.fillStyle = 'rgba(192,57,43,0.25)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(192,57,43,0.45)';
  ctx.stroke();
  lkText(ctx, 'THE LANTERN KITCHEN', LK.CANVAS_W / 2, 370, 26,
    'rgba(255,243,214,0.35)', 'center', 'bold');
}

// --- Screens --------------------------------------------------------------------

function lkDrawTitle(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(46,33,24,0.82)';
  ctx.fillRect(0, 0, LK.CANVAS_W, LK.CANVAS_H);
  lkText(ctx, '🏮 THE LANTERN KITCHEN 🏮', LK.CANVAS_W / 2, 150, 44, '#ffc93c', 'center', 'bold');
  lkText(ctx, 'A tiny restaurant. A long night. A lot of hungry guests.', LK.CANVAS_W / 2, 205, 18, '#fff3d6', 'center', 'bold');
  const lines = [
    'WASD / arrows — move      •      Click a station to walk over and use it',
    'Click the pantry, take ingredients, chop, cook, plate, serve.',
    'Serve tickets before their patience runs out. Three walk-outs ends the day.',
    'Combos pay: serve dish after dish to multiply your tips. Reach $' + LK.TARGET_COINS + ' for 3 stars.',
  ];
  lines.forEach((l, i) => lkText(ctx, l, LK.CANVAS_W / 2, 270 + i * 30, 16, '#fff3d6', 'center', 'normal'));
  // A sample ticket, so the goal reads at a glance.
  ctx.save();
  lkRoundRect(ctx, LK.CANVAS_W / 2 - 130, 420, 260, 84, 10);
  ctx.fillStyle = '#fff8e7';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d9c48f';
  ctx.stroke();
  lkText(ctx, 'Lantern Noodles', LK.CANVAS_W / 2, 442, 16, '#2e2118', 'center', 'bold');
  ['boiled-noodles', 'stir-veg', 'sauce'].forEach((comp, i) => {
    lkDrawIngredientIcon(ctx, comp, LK.CANVAS_W / 2 - 40 + i * 40, 472, 13);
  });
  ctx.restore();
  lkText(ctx, 'Click or press Enter to start the day', LK.CANVAS_W / 2, 560, 20, '#ffc93c', 'center', 'bold');
  lkText(ctx, 'M — mute    •    P — pause    •    Q — drop what you carry', LK.CANVAS_W / 2, 596, 14, 'rgba(255,243,214,0.7)', 'center', 'normal');
  ctx.restore();
}

function lkDrawPaused(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(46,33,24,0.7)';
  ctx.fillRect(0, 0, LK.CANVAS_W, LK.CANVAS_H);
  lkText(ctx, 'PAUSED', LK.CANVAS_W / 2, 320, 40, '#fff3d6', 'center', 'bold');
  lkText(ctx, 'Press P or click to get back to the pass', LK.CANVAS_W / 2, 370, 17, '#ffc93c', 'center', 'bold');
  ctx.restore();
}

function lkDrawDayOver(ctx, state) {
  const r = state.result;
  ctx.save();
  ctx.fillStyle = 'rgba(46,33,24,0.88)';
  ctx.fillRect(0, 0, LK.CANVAS_W, LK.CANVAS_H);
  lkText(ctx, r.won ? '★ SERVICE COMPLETE ★' : 'SERVICE OVER', LK.CANVAS_W / 2, 160, 40,
    r.won ? '#ffc93c' : '#ff9d9d', 'center', 'bold');
  lkText(ctx, r.finished ? 'The day ran its full course.' : 'Too many guests walked out.',
    LK.CANVAS_W / 2, 205, 17, '#fff3d6', 'center', 'bold');
  const stars = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
  lkText(ctx, stars, LK.CANVAS_W / 2, 260, 40, '#ffc93c', 'center', 'bold');
  const rows = [
    'Coins earned: $' + r.coins + '   (target $' + LK.TARGET_COINS + ')',
    'Dishes served: ' + r.served,
    'Tickets missed: ' + r.missed,
    'Best combo: ×' + Math.max(1, r.bestCombo),
  ];
  rows.forEach((row, i) => lkText(ctx, row, LK.CANVAS_W / 2, 320 + i * 32, 18, '#fff3d6', 'center', 'normal'));
  lkText(ctx, 'Press R or click to cook another day', LK.CANVAS_W / 2, 500, 19, '#ffc93c', 'center', 'bold');
  ctx.restore();
}

// --- Frame ------------------------------------------------------------------------

function lkRender(ctx, state) {
  lkDrawFloor(ctx, state);
  if (state.mode === 'title') {
    // The kitchen sits behind the title, mid-service, so the first screen
    // already shows what the game is.
    for (const id of Object.keys(state.stations)) lkDrawStation(ctx, state, state.stations[id]);
    lkDrawOrders(ctx, state);
    lkDrawHud(ctx, state);
    lkDrawPlayer(ctx, state);
    lkDrawTitle(ctx, state);
    return;
  }
  for (const id of Object.keys(state.stations)) lkDrawStation(ctx, state, state.stations[id]);
  lkDrawOrders(ctx, state);
  lkDrawHud(ctx, state);
  lkDrawPlayer(ctx, state);
  lkDrawFx(ctx, state);
  lkDrawPantryPicker(ctx, state);
  lkDrawBanner(ctx, state);
  lkDrawHint(ctx, state);
  if (state.mode === 'paused') lkDrawPaused(ctx, state);
  if (state.mode === 'dayover') lkDrawDayOver(ctx, state);
}
