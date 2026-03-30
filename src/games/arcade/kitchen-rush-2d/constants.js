export const STAGE_WIDTH = 960;
export const STAGE_HEIGHT = 560;

export const FIXED_STEP_MS = 1000 / 60;
export const PLAYER_RADIUS = 18;
export const PLAYER_SPEED = 240;
export const INTERACT_RANGE = 86;
export const STATION_HINT_RANGE = 112;

export const SESSION_DURATION_MS = 4 * 60 * 1000;
export const MAX_ACTIVE_ORDERS = 2;
export const ORDER_SPAWN_INTERVAL_MS = 15000;
export const ORDER_PATIENCE_MS = 90000;

export const MAX_PARTICLES = 320;

export const STATION_LAYOUT = {
  fridge: {
    id: "fridge_1",
    type: "fridge",
    labelEs: "Nevera",
    labelEn: "Fridge",
    x: 70,
    y: 70,
    w: 126,
    h: 100,
  },
  prep: {
    id: "prep_1",
    type: "prep_table",
    labelEs: "Mesa",
    labelEn: "Prep",
    x: 230,
    y: 70,
    w: 124,
    h: 100,
  },
  cuttingBoard: {
    id: "cutting_board_1",
    type: "cutting_board",
    labelEs: "Tabla",
    labelEn: "Board",
    x: 390,
    y: 70,
    w: 128,
    h: 100,
  },
  pan: {
    id: "pan_1",
    type: "pan",
    labelEs: "Sarten",
    labelEn: "Pan",
    x: 570,
    y: 72,
    w: 122,
    h: 98,
  },
  pot: {
    id: "pot_1",
    type: "pot",
    labelEs: "Olla",
    labelEn: "Pot",
    x: 724,
    y: 72,
    w: 122,
    h: 98,
  },
  oven: {
    id: "oven_1",
    type: "oven",
    labelEs: "Horno",
    labelEn: "Oven",
    x: 758,
    y: 220,
    w: 130,
    h: 118,
  },
  plating: {
    id: "plating_1",
    type: "plating",
    labelEs: "Emplatado",
    labelEn: "Plating",
    x: 392,
    y: 246,
    w: 134,
    h: 100,
  },
  serving: {
    id: "serving_1",
    type: "serving",
    labelEs: "Entrega",
    labelEn: "Serve",
    x: 570,
    y: 418,
    w: 140,
    h: 106,
  },
};
