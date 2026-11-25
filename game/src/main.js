// Lantern Kitchen — main: boot, the frame loop, and the screens that sit
// around play (title, pause, day over). The game itself lives in the
// state / logic / render modules.

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const state = lkNewState();

  // The title screen shows a kitchen already mid-service, so it reads as a
  // game at first glance: seed it with a gentle tableau.
  (function seedTitle() {
    lkStartDay(state);
    state.mode = 'title';
    state.orders = [
      { id: 1, dish: 'lantern-noodles', patience: 60, maxPatience: 78, born: 0 },
      { id: 2, dish: 'ember-skewers', patience: 48, maxPatience: 70, born: 0 },
    ];
    state.nextOrderId = 3;
    state.stations.stove.cookSlots[0] = { item: 'noodles', progress: 3, needed: 6, done: false, burnIn: 0, result: 'boiled-noodles' };
    state.stations.board.boardItem = { item: 'veg', chops: 1, chopsNeeded: 3 };
    state.player.x = 640;
    state.player.y = 420;
  })();

  // A scripted shot (?shot=N) replaces the title with a frozen mid-game state.
  const shot = parseInt(params.get('shot') || '0', 10);
  if (shot >= 1 && shot <= 4) {
    document.body.classList.add('shot');
    lkApplyShot(state, shot);
  }

  LKInput.attach(canvas, {
    onKey(k) {
      LKSound.unlock();
      if (state.mode === 'title' && (k === 'enter' || k === ' ')) {
        startDay();
      } else if (state.mode === 'dayover' && (k === 'r' || k === 'enter')) {
        startDay();
      } else if (state.mode === 'paused' && (k === 'p' || k === 'escape' || k === 'enter')) {
        state.mode = 'playing';
      }
      if (k === 'm') {
        state.muted = !state.muted;
        LKSound.setMuted(state.muted);
      }
    },
    onPointer() {
      LKSound.unlock();
      if (state.mode === 'title') {
        startDay();
      } else if (state.mode === 'dayover') {
        startDay();
      } else if (state.mode === 'paused') {
        state.mode = 'playing';
      }
    },
  });

  function startDay() {
    LKInput.reset();
    lkStartDay(state);
    LKSound.musicStart();
    LKSound.sfx.ding();
  }

  // --- Self-test (?test=1) -------------------------------------------------
  // Runs a scripted slice of play through the game's own functions and
  // writes the results into the page, so a headless run can prove the game
  // works without a human at the keyboard.
  function selfTest() {
    const out = [];
    const check = (name, ok) => out.push((ok ? 'PASS ' : 'FAIL ') + name);
    try {
      const s = lkNewState();
      lkStartDay(s);
      check('day starts playing', s.mode === 'playing');
      // Take noodles from the pantry and boil them.
      s.player.carrying.push('noodles');
      const stove = s.stations.stove;
      lkInteract(s, stove);
      check('noodles go on the stove', stove.cookSlots[0].item === 'noodles');
      for (let i = 0; i < 70; i++) lkUpdate(s, 0.1);
      check('noodles finish boiling', stove.cookSlots[0].item === 'boiled-noodles' && stove.cookSlots[0].done);
      lkInteract(s, stove);
      check('boiled noodles picked up', s.player.carrying.includes('boiled-noodles'));
      // Chop veg, fry it, add both plus sauce to a plate.
      s.player.carrying.push('veg');
      const board = s.stations.board;
      lkInteract(s, board);
      lkInteract(s, board); lkInteract(s, board); lkInteract(s, board);
      check('veg chopped', board.boardItem && board.boardItem.item === 'chopped-veg');
      lkInteract(s, board);
      check('chopped veg picked up', s.player.carrying.includes('chopped-veg'));
      lkInteract(s, stove);
      check('veg goes on the stove', stove.cookSlots.some((sl) => sl.item === 'chopped-veg'));
      for (let i = 0; i < 60; i++) lkUpdate(s, 0.1);
      check('veg stir-fried', stove.cookSlots.some((sl) => sl.item === 'stir-veg' && sl.done));
      lkInteract(s, stove);
      check('stir-fried veg picked up', s.player.carrying.includes('stir-veg'));
      s.player.carrying.push('sauce');
      const plate = s.stations.plating;
      lkInteract(s, plate);
      lkInteract(s, plate);
      lkInteract(s, plate);
      check('lantern noodles plated', plate.plate.dish === 'lantern-noodles');
      lkInteract(s, plate);
      check('plate picked up', s.player.carrying.some((it) => lkIsPlate(it)));
      // Serve it against a matching ticket.
      s.orders = [{ id: 9, dish: 'lantern-noodles', patience: 50, maxPatience: 78, born: 0 }];
      const coinsBefore = s.coins;
      lkInteract(s, s.stations.window);
      check('dish served for coins', s.coins > coinsBefore && s.served === 1);
      // A missed ticket costs a heart.
      const heartsBefore = s.hearts;
      s.orders = [{ id: 10, dish: 'ember-skewers', patience: 0.05, maxPatience: 70, born: 0 }];
      lkUpdate(s, 0.1);
      check('expired ticket costs a heart', s.hearts === heartsBefore - 1 && s.missed === 1);
      // Burnt food: leave a finished cook sitting.
      s.player.carrying.push('rice');
      lkInteract(s, stove);
      for (let i = 0; i < 70; i++) lkUpdate(s, 0.1);
      for (let i = 0; i < 90; i++) lkUpdate(s, 0.1);
      check('left too long, it burns', stove.cookSlots.some((sl) => sl.item === 'burnt'));
      check('game still running', s.mode === 'playing');
    } catch (e) {
      out.push('FAIL exception: ' + (e && e.message));
    }
    const el = document.getElementById('test-results');
    if (el) el.textContent = out.join('\n');
    document.title = out.some((l) => l.indexOf('FAIL') === 0) ? 'SELFTEST FAIL' : 'SELFTEST PASS';
    return out;
  }

  if (params.get('test') === '1') {
    selfTest();
  }

  // --- Frame loop ------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (state.mode === 'playing' && !state.frozen) {
      lkUpdate(state, dt);
    } else if (state.mode === 'playing' && state.frozen) {
      // A frozen shot still lets the mouse hover, but nothing advances.
      LKInput.takeClick();
      LKInput.takeKeyPress();
    }
    // Title / pause / day-over clicks are handled by the input handlers.
    lkRender(ctx, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Expose the state for debugging and for the screenshot harness.
  window.__lanternKitchen = { state, lkNewState, lkStartDay };
})();
