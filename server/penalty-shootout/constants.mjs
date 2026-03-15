export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 620;
export const INITIAL_SHOTS = 5;

export const GOAL_FRAME = {
  x: 286,
  y: 84,
  w: 508,
  h: 212,
};

export const PENALTY_SPOT = {
  x: CANVAS_WIDTH / 2,
  y: 515,
};

export const GOAL_CENTER_X = GOAL_FRAME.x + GOAL_FRAME.w * 0.5;
export const KEEPER_BASE_Y = GOAL_FRAME.y + GOAL_FRAME.h - 22;

export const SHOT_ZONES = [
  {
    id: "down-left",
    row: 1,
    col: 0,
    side: "left",
    target: { x: GOAL_FRAME.x + 86, y: GOAL_FRAME.y + GOAL_FRAME.h - 26 },
  },
  {
    id: "down-right",
    row: 1,
    col: 2,
    side: "right",
    target: { x: GOAL_FRAME.x + GOAL_FRAME.w - 86, y: GOAL_FRAME.y + GOAL_FRAME.h - 26 },
  },
  {
    id: "top-left",
    row: 0,
    col: 0,
    side: "left",
    target: { x: GOAL_FRAME.x + 80, y: GOAL_FRAME.y + 36 },
  },
  {
    id: "top-right",
    row: 0,
    col: 2,
    side: "right",
    target: { x: GOAL_FRAME.x + GOAL_FRAME.w - 80, y: GOAL_FRAME.y + 36 },
  },
  {
    id: "center",
    row: 1,
    col: 1,
    side: "center",
    target: { x: GOAL_CENTER_X, y: GOAL_FRAME.y + GOAL_FRAME.h * 0.52 },
  },
];

export const ZONE_IDS = SHOT_ZONES.map((zone) => zone.id);
export const ZONE_BY_ID = Object.fromEntries(SHOT_ZONES.map((zone) => [zone.id, zone]));

export const PLAYER_TEAM = {
  id: "player-default",
  displayName: "Your Club",
  shortName: "YOU",
  colors: {
    primary: "#1d4ed8",
    secondary: "#e2e8f0",
    accent: "#38bdf8",
  },
  uniform: {
    shirt: "#1d4ed8",
    shorts: "#102a84",
    socks: "#e2e8f0",
    keeper: "#f97316",
  },
};
