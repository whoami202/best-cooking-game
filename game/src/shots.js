// Lantern Kitchen — shots: scripted mid-game states for the entry's
// screenshots. A URL like game/index.html?shot=2 loads the game straight
// into that state through the game's own code, so every screenshot is a
// real render of the game, never an edited image.
//
//   shot=1  cover: a busy kitchen, three tickets, a chop in progress,
//           a half-built plate, a finished plate waiting at the window.
//   shot=2  rush hour: four tickets, stove and grill both cooking, steam.
//   shot=3  the serve: a finished plate carried to the window, coins flying.
//   shot=4  plating: dumplings nearly assembled, sauce going on last.

function lkApplyShot(state, n) {
  lkStartDay(state);
  state.mode = 'playing';
  // Freeze the clock for the screenshot: the shot states are tableaus.
  state.frozen = true;

  const st = state.stations;
  const P = state.player;

  if (n === 1) {
    state.time = 62;
    state.timeLeft = LK.DAY_LENGTH - 62;
    state.coins = 74;
    state.combo = 2;
    state.comboTimer = 12;
    state.orders = [
      { id: 1, dish: 'lantern-noodles', patience: 52, maxPatience: 78, born: 10 },
      { id: 2, dish: 'ember-skewers', patience: 30, maxPatience: 70, born: 22 },
      { id: 3, dish: 'golden-dumplings', patience: 64, maxPatience: 78, born: 40 },
    ];
    state.nextOrderId = 4;
    // The chef is mid-chop at the board, clear of its edge.
    P.x = 296; P.y = 306; P.dir = -1;
    P.carrying = ['sauce'];
    st.board.boardItem = { item: 'veg', chops: 2, chopsNeeded: 3 };
    lkChopBits(state, 129, 272, '#7bc96f');
    // The stove is boiling noodles; the grill has meat on.
    st.stove.cookSlots[0] = { item: 'noodles', progress: 4.2, needed: 6, done: false, burnIn: 0, result: 'boiled-noodles' };
    st.grill.cookSlots[0] = { item: 'meat', progress: 5.1, needed: 7, done: false, burnIn: 0, result: 'grilled-meat' };
    lkSteam(state, 1151, 140, 6);
    lkSteam(state, 1151, 262, 4);
    // A half-built plate: noodles + stir-fried veg, sauce still in hand.
    st.plating.plate = { components: ['boiled-noodles', 'stir-veg'] };
    lkHint(state, 'Chop the veg, then finish the noodles — sauce in hand!');
    return;
  }

  if (n === 2) {
    state.time = 118;
    state.timeLeft = LK.DAY_LENGTH - 118;
    state.coins = 132;
    state.combo = 3;
    state.comboTimer = 18;
    state.rushLeft = 9;
    state.orders = [
      { id: 1, dish: 'sunrise-rice', patience: 22, maxPatience: 66, born: 60 },
      { id: 2, dish: 'lantern-noodles', patience: 41, maxPatience: 72, born: 80 },
      { id: 3, dish: 'garden-stirfry', patience: 48, maxPatience: 70, born: 96 },
      { id: 4, dish: 'ember-skewers', patience: 55, maxPatience: 70, born: 110 },
    ];
    state.nextOrderId = 5;
    P.x = 640; P.y = 420; P.dir = 1;
    P.carrying = ['chopped-veg', 'chopped-egg'];
    st.stove.cookSlots[0] = { item: 'rice', progress: 5.4, needed: 6, done: false, burnIn: 0, result: 'steamed-rice' };
    st.stove.cookSlots[1] = { item: 'chopped-veg', progress: 3.1, needed: 5, done: false, burnIn: 0, result: 'stir-veg' };
    st.grill.cookSlots[0] = { item: 'chopped-meat', progress: 5.8, needed: 6, done: false, burnIn: 0, result: 'grilled-meat' };
    st.steamer.cookSlots[0] = { item: 'dough', progress: 6.2, needed: 7, done: false, burnIn: 0, result: 'dumpling' };
    lkSteam(state, 1090, 140, 5);
    lkSteam(state, 1210, 140, 5);
    lkSteam(state, 1151, 262, 5);
    lkSteam(state, 1151, 384, 5);
    lkBanner(state, 'RUSH HOUR! Tickets are flying in!');
    // Frozen shots never age the banner, so park it mid-fade (fully opaque).
    state.banner.life = 1.9;
    return;
  }

  if (n === 3) {
    state.time = 96;
    state.timeLeft = LK.DAY_LENGTH - 96;
    state.coins = 118;
    state.combo = 4;
    state.comboTimer = 20;
    state.orders = [
      { id: 1, dish: 'golden-dumplings', patience: 44, maxPatience: 74, born: 50 },
      { id: 2, dish: 'sunrise-rice', patience: 58, maxPatience: 72, born: 70 },
    ];
    state.nextOrderId = 3;
    // The chef carries the finished dumplings to the window.
    P.x = 300; P.y = 600; P.dir = -1;
    P.carrying = ['plate:golden-dumplings'];
    lkSparkle(state, 129, 590);
    lkFloat(state, 300, 540, '+32 coins', '#ffc93c');
    lkFloat(state, 300, 516, 'Speedy tip!', '#7bc96f');
    lkHint(state, 'Ring the bell — the dumplings are ready to go!');
    return;
  }

  if (n === 4) {
    state.time = 38;
    state.timeLeft = LK.DAY_LENGTH - 38;
    state.coins = 41;
    state.combo = 1;
    state.comboTimer = 9;
    state.orders = [
      { id: 1, dish: 'golden-dumplings', patience: 61, maxPatience: 78, born: 8 },
      { id: 2, dish: 'sunrise-rice', patience: 35, maxPatience: 70, born: 18 },
    ];
    state.nextOrderId = 3;
    P.x = 770; P.y = 500; P.dir = 1;
    P.carrying = ['sauce'];
    st.plating.plate = { components: ['dumpling'] };
    st.steamer.cookSlots[0] = { item: 'dumpling', progress: 7, needed: 7, done: true, burnIn: 6, result: 'dumpling' };
    lkSteam(state, 1151, 384, 4);
    lkHint(state, 'One more dumpling steaming — sauce goes on last!');
    return;
  }

  // Unknown shot: the title screen, which is itself a full kitchen view.
  state.mode = 'title';
}
