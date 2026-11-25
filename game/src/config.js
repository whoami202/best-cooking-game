// Lantern Kitchen — configuration: canvas, layout, ingredients, recipes, tuning.
// All values live here so the rest of the game reads from one place.

const LK = {};

LK.CANVAS_W = 1280;
LK.CANVAS_H = 720;
LK.TOP_BAR_H = 92;

LK.DAY_LENGTH = 180; // seconds per service day
LK.TARGET_COINS = 200; // coins needed for a 3-star day
LK.MAX_HEARTS = 3;
LK.MAX_HANDS = 3; // items the chef can carry at once
LK.PLATE_MAX_COMPONENTS = 3; // components a finished plate can hold
LK.MAX_ORDERS = 4;
LK.BURN_GRACE = 8; // seconds a finished cook sits before it burns

LK.PLAYER_SPEED = 250; // px per second
LK.PLAYER_RADIUS = 18;
LK.INTERACT_RANGE = 96; // px from a station centre to interact

// --- Ingredients -----------------------------------------------------------
// prep: how the pantry item is transformed. "none" means ready to plate.
// station: where the prep happens. chopTurns: clicks needed on the board.
// cookSeconds: seconds on its station.
LK.INGREDIENTS = {
  noodles: { name: 'Noodles', color: '#f2c94c', prep: 'boil', station: 'stove', cookSeconds: 6, result: 'boiled-noodles' },
  rice: { name: 'Rice', color: '#f5f0e1', prep: 'boil', station: 'stove', cookSeconds: 6, result: 'steamed-rice' },
  dough: { name: 'Dough', color: '#e8d5a8', prep: 'steam', station: 'steamer', cookSeconds: 7, result: 'dumpling' },
  meat: { name: 'Meat', color: '#d96a5f', prep: 'chop', station: 'board', chopTurns: 3, result: 'chopped-meat' },
  veg: { name: 'Veg', color: '#7bc96f', prep: 'chop', station: 'board', chopTurns: 3, result: 'chopped-veg' },
  egg: { name: 'Egg', color: '#ffd98a', prep: 'chop', station: 'board', chopTurns: 2, result: 'chopped-egg' },
  sauce: { name: 'Sauce', color: '#c0392b', prep: 'none', station: null, cookSeconds: 0, result: 'sauce' },
};

// Prepared components (results of prep) and their display names.
LK.COMPONENTS = {
  'boiled-noodles': { name: 'Boiled Noodles', color: '#f2c94c' },
  'steamed-rice': { name: 'Steamed Rice', color: '#f5f0e1' },
  dumpling: { name: 'Dumpling', color: '#e8d5a8' },
  'chopped-meat': { name: 'Chopped Meat', color: '#d96a5f' },
  'chopped-veg': { name: 'Chopped Veg', color: '#7bc96f' },
  'chopped-egg': { name: 'Beaten Egg', color: '#ffd98a' },
  sauce: { name: 'Sauce', color: '#c0392b' },
  'grilled-meat': { name: 'Grilled Meat', color: '#a5503c' },
  'stir-veg': { name: 'Stir-fried Veg', color: '#5da24f' },
  burnt: { name: 'Burnt!', color: '#3a2e28' },
};

// Extra station transforms: a prepared component cooked again on a station.
LK.COOK_TRANSFORMS = {
  'chopped-veg:stove': { result: 'stir-veg', cookSeconds: 5 },
  'meat:grill': { result: 'grilled-meat', cookSeconds: 7 },
  'chopped-meat:grill': { result: 'grilled-meat', cookSeconds: 6 },
};

// --- Recipes ---------------------------------------------------------------
// components: the prepared components a finished plate must hold.
LK.RECIPES = {
  'lantern-noodles': {
    name: 'Lantern Noodles', price: 22, color: '#f2c94c',
    components: ['boiled-noodles', 'stir-veg', 'sauce'],
    blurb: 'Noodles, wok veg, lantern sauce',
  },
  'ember-skewers': {
    name: 'Ember Skewers', price: 24, color: '#d96a5f',
    components: ['grilled-meat', 'chopped-veg'],
    blurb: 'Grilled meat over fresh veg',
  },
  'golden-dumplings': {
    name: 'Golden Dumplings', price: 20, color: '#e8d5a8',
    components: ['dumpling', 'sauce'],
    blurb: 'Steamed dumplings, red sauce',
  },
  'sunrise-rice': {
    name: 'Sunrise Rice', price: 22, color: '#ffd98a',
    components: ['steamed-rice', 'chopped-egg', 'sauce'],
    blurb: 'Rice, beaten egg, lantern sauce',
  },
  'garden-stirfry': {
    name: 'Garden Stir-fry', price: 16, color: '#7bc96f',
    components: ['stir-veg', 'chopped-egg'],
    blurb: 'Wok veg folded with egg',
  },
};

LK.RECIPE_IDS = Object.keys(LK.RECIPES);

// --- Kitchen layout --------------------------------------------------------
// Stations are rectangles on the floor; the chef walks around them.
LK.STATIONS = [
  { id: 'pantry', name: 'Pantry', x: 24, y: 110, w: 210, h: 92, kind: 'pantry' },
  { id: 'board', name: 'Chopping Board', x: 24, y: 232, w: 210, h: 92, kind: 'board' },
  { id: 'stove', name: 'Stove', x: 1046, y: 110, w: 210, h: 92, kind: 'stove', slots: 2 },
  { id: 'grill', name: 'Char Grill', x: 1046, y: 232, w: 210, h: 92, kind: 'grill', slots: 1 },
  { id: 'steamer', name: 'Steamer', x: 1046, y: 354, w: 210, h: 92, kind: 'steamer', slots: 1 },
  { id: 'plating', name: 'Plating Counter', x: 440, y: 566, w: 400, h: 92, kind: 'plating' },
  { id: 'window', name: 'Serving Window', x: 24, y: 566, w: 210, h: 92, kind: 'window' },
  { id: 'trash', name: 'Bin', x: 1046, y: 566, w: 150, h: 76, kind: 'trash' },
];

// Pantry picker: the ingredient buttons shown when the pantry is open.
LK.PANTRY_ORDER = ['noodles', 'rice', 'dough', 'meat', 'veg', 'egg', 'sauce'];

// --- Difficulty ------------------------------------------------------------
LK.ORDER_FIRST_DELAY = 4; // seconds until the first ticket
LK.ORDER_INTERVAL_START = 14;
LK.ORDER_INTERVAL_MIN = 7;
LK.ORDER_INTERVAL_STEP = 0.45; // seconds shaved off per order spawned
LK.ORDER_PATIENCE_START = 78; // seconds a ticket lives
LK.ORDER_PATIENCE_MIN = 55;
LK.RUSH_EVERY = 50; // seconds between rush hours
LK.RUSH_LENGTH = 15; // seconds a rush lasts
LK.RUSH_INTERVAL = 5; // spawn interval during a rush
LK.COMBO_WINDOW = 25; // seconds between serves to keep the combo alive
LK.TIP_MAX = 12; // bonus coins for serving with patience to spare

// --- Palette ---------------------------------------------------------------
LK.COLORS = {
  floorA: '#b98a5e', floorB: '#a87a52',
  wall: '#7c4a2d', topBar: '#5d3620',
  counterWood: '#8a5a33', counterTop: '#c89b6a',
  counterEdge: '#6e4525', steel: '#b9c4cc', steelDark: '#8b98a3',
  ticket: '#fff8e7', ticketEdge: '#d9c48f',
  ink: '#2e2118', cream: '#fff3d6', gold: '#ffc93c',
  green: '#7bc96f', red: '#d9534f', orange: '#e8912d',
  chefHat: '#ffffff', chefShirt: '#e8f0f2', chefApron: '#c0392b',
};
