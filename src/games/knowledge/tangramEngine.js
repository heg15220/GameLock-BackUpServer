const SQRT2 = Math.SQRT2;

export const TANGRAM_BOARD_CONFIG = Object.freeze({
  width: 980,
  height: 560,
  trayCenterX: 248,
  trayCenterY: 282,
  targetCenterX: 708,
  targetCenterY: 282,
  scale: 58,
  snapDistance: 30
});

export const TANGRAM_PIECES = Object.freeze([
  { id: "piece-large-a", type: "largeTriangle", color: "#f97316" },
  { id: "piece-large-b", type: "largeTriangle", color: "#fb923c" },
  { id: "piece-medium", type: "mediumTriangle", color: "#22c55e" },
  { id: "piece-small-a", type: "smallTriangle", color: "#06b6d4" },
  { id: "piece-small-b", type: "smallTriangle", color: "#3b82f6" },
  { id: "piece-square", type: "square", color: "#a855f7" },
  { id: "piece-parallelogram", type: "parallelogram", color: "#ef4444" }
]);

const RAW_SHAPES_BY_TYPE = Object.freeze({
  largeTriangle: [
    [0, 0],
    [2, 0],
    [0, 2]
  ],
  mediumTriangle: [
    [0, 0],
    [SQRT2, 0],
    [0, SQRT2]
  ],
  smallTriangle: [
    [0, 0],
    [1, 0],
    [0, 1]
  ],
  square: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  ],
  parallelogram: [
    [0, 0],
    [SQRT2, 0],
    [SQRT2 + 1 / SQRT2, 1 / SQRT2],
    [1 / SQRT2, 1 / SQRT2]
  ]
});

const centerPolygon = (points) => {
  const total = points.reduce(
    (accumulator, [x, y]) => {
      accumulator.x += x;
      accumulator.y += y;
      return accumulator;
    },
    { x: 0, y: 0 }
  );
  const centerX = total.x / points.length;
  const centerY = total.y / points.length;
  return points.map(([x, y]) => [x - centerX, y - centerY]);
};

export const TANGRAM_SHAPES_BY_TYPE = Object.freeze(
  Object.fromEntries(
    Object.entries(RAW_SHAPES_BY_TYPE).map(([type, points]) => [type, centerPolygon(points)])
  )
);

export const normalizeRotationSteps = (steps) => {
  const value = Number(steps) || 0;
  return ((Math.round(value) % 8) + 8) % 8;
};

const rotatePointBySteps = ([x, y], steps) => {
  const radians = normalizeRotationSteps(steps) * (Math.PI / 4);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x * cos - y * sin, x * sin + y * cos];
};

const pointsNearlyEqual = (left, right, epsilon = 1e-4) =>
  Math.abs(left[0] - right[0]) <= epsilon && Math.abs(left[1] - right[1]) <= epsilon;

const normalizePointSet = (points) =>
  points
    .map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))])
    .sort((left, right) => (left[0] === right[0] ? left[1] - right[1] : left[0] - right[0]));

const pointSetsEqual = (leftPoints, rightPoints) => {
  const left = normalizePointSet(leftPoints);
  const right = normalizePointSet(rightPoints);
  if (left.length !== right.length) return false;
  return left.every((point, index) => pointsNearlyEqual(point, right[index]));
};

export const transformTangramPolygon = (polygon, pose, scale = 1) => {
  const positionX = Number(pose?.x) || 0;
  const positionY = Number(pose?.y) || 0;
  const rotation = normalizeRotationSteps(pose?.rotation);
  const flipped = Boolean(pose?.flip);
  const unitScale = Number(scale) || 1;

  return polygon.map(([pointX, pointY]) => {
    const sourceX = flipped ? -pointX : pointX;
    const sourceY = pointY;
    const [rotatedX, rotatedY] = rotatePointBySteps([sourceX, sourceY], rotation);
    return [positionX + rotatedX * unitScale, positionY + rotatedY * unitScale];
  });
};

export const getTangramPolygonForPiece = (
  piece,
  scale = TANGRAM_BOARD_CONFIG.scale
) =>
  transformTangramPolygon(
    TANGRAM_SHAPES_BY_TYPE[piece.type] ?? TANGRAM_SHAPES_BY_TYPE.smallTriangle,
    piece,
    scale
  );

const getPolygonAxes = (polygon) =>
  polygon.map((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const edgeX = next[0] - point[0];
    const edgeY = next[1] - point[1];
    const normalX = -edgeY;
    const normalY = edgeX;
    const length = Math.hypot(normalX, normalY) || 1;
    return [normalX / length, normalY / length];
  });

const projectPolygonOnAxis = (polygon, [axisX, axisY]) => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const [x, y] of polygon) {
    const projection = x * axisX + y * axisY;
    if (projection < min) min = projection;
    if (projection > max) max = projection;
  }
  return [min, max];
};

export const polygonsOverlapSAT = (leftPolygon, rightPolygon, epsilon = 1e-6) => {
  const axes = [...getPolygonAxes(leftPolygon), ...getPolygonAxes(rightPolygon)];
  for (const axis of axes) {
    const [leftMin, leftMax] = projectPolygonOnAxis(leftPolygon, axis);
    const [rightMin, rightMax] = projectPolygonOnAxis(rightPolygon, axis);
    if (leftMax <= rightMin + epsilon || rightMax <= leftMin + epsilon) {
      return false;
    }
  }
  return true;
};

export const computeTangramOverlapPairs = (
  pieces,
  scale = TANGRAM_BOARD_CONFIG.scale
) => {
  const polygons = pieces.map((piece) => ({
    id: piece.id,
    polygon: getTangramPolygonForPiece(piece, scale)
  }));

  const overlaps = [];
  for (let index = 0; index < polygons.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < polygons.length; nextIndex += 1) {
      if (polygonsOverlapSAT(polygons[index].polygon, polygons[nextIndex].polygon)) {
        overlaps.push([polygons[index].id, polygons[nextIndex].id]);
      }
    }
  }
  return overlaps;
};

const SLOT_TYPES_BY_INDEX = Object.freeze([
  "largeTriangle",
  "largeTriangle",
  "mediumTriangle",
  "smallTriangle",
  "smallTriangle",
  "square",
  "parallelogram"
]);

const BASE_TEMPLATE_POSES = Object.freeze([
  {
    id: "silueta-a",
    label: { es: "Silueta A", en: "Silhouette A" },
    poses: [
      { x: 1.868, y: 1.167, rotation: 7, flip: false },
      { x: 0.868, y: -0.833, rotation: 6, flip: false },
      { x: -0.132, y: 0.667, rotation: 7, flip: false },
      { x: 0.368, y: -2.333, rotation: 2, flip: false },
      { x: -0.632, y: -0.833, rotation: 6, flip: false },
      { x: -1.632, y: 0.667, rotation: 3, flip: false },
      { x: -0.132, y: 2.167, rotation: 1, flip: true }
    ]
  },
  {
    id: "silueta-b",
    label: { es: "Silueta B", en: "Silhouette B" },
    poses: [
      { x: 1.029, y: 1.417, rotation: 1, flip: false },
      { x: -0.471, y: -1.083, rotation: 1, flip: false },
      { x: -0.971, y: 0.417, rotation: 7, flip: false },
      { x: -1.971, y: 1.417, rotation: 7, flip: false },
      { x: -0.971, y: 1.917, rotation: 0, flip: false },
      { x: 0.029, y: -0.083, rotation: 6, flip: false },
      { x: 1.029, y: -2.083, rotation: 3, flip: false }
    ]
  },
  {
    id: "silueta-c",
    label: { es: "Silueta C", en: "Silhouette C" },
    poses: [
      { x: 1.785, y: -1.687, rotation: 4, flip: false },
      { x: 0.285, y: 1.813, rotation: 6, flip: false },
      { x: 1.785, y: 1.813, rotation: 7, flip: false },
      { x: 0.285, y: -0.687, rotation: 6, flip: false },
      { x: -2.215, y: 2.313, rotation: 3, flip: false },
      { x: -0.715, y: -0.187, rotation: 5, flip: false },
      { x: -1.215, y: 2.313, rotation: 5, flip: true }
    ]
  },
  {
    id: "silueta-d",
    label: { es: "Silueta D", en: "Silhouette D" },
    poses: [
      { x: 0.833, y: -0.971, rotation: 6, flip: false },
      { x: -0.167, y: 2.529, rotation: 5, flip: false },
      { x: 0.333, y: 0.529, rotation: 3, flip: false },
      { x: -0.667, y: -1.971, rotation: 0, flip: false },
      { x: 1.833, y: -1.971, rotation: 4, flip: false },
      { x: -0.667, y: 1.529, rotation: 0, flip: false },
      { x: -1.167, y: -2.971, rotation: 7, flip: false }
    ]
  },
  {
    id: "silueta-e",
    label: { es: "Silueta E", en: "Silhouette E" },
    poses: [
      { x: -0.583, y: 1.73, rotation: 4, flip: false },
      { x: 0.417, y: -0.27, rotation: 7, flip: false },
      { x: 0.917, y: -2.27, rotation: 2, flip: false },
      { x: 0.417, y: 3.23, rotation: 3, flip: false },
      { x: -0.083, y: -3.27, rotation: 4, flip: false },
      { x: 1.417, y: -0.27, rotation: 0, flip: false },
      { x: -0.583, y: -1.77, rotation: 3, flip: false }
    ]
  }
]);

const MIRROR_VARIANTS = Object.freeze([
  { id: "base", labelEs: "", labelEn: "", mirrorX: false, mirrorY: false },
  { id: "mirror-x", labelEs: " espejo horizontal", labelEn: " horizontal mirror", mirrorX: true, mirrorY: false },
  { id: "mirror-y", labelEs: " espejo vertical", labelEn: " vertical mirror", mirrorX: false, mirrorY: true },
  { id: "mirror-xy", labelEs: " espejo doble", labelEn: " double mirror", mirrorX: true, mirrorY: true }
]);

const mirrorPoint = ([x, y], variant) => [
  variant.mirrorX ? -x : x,
  variant.mirrorY ? -y : y
];

const resolveMirroredOrientation = (type, rotation, flip, variant) => {
  const sourcePolygon = transformTangramPolygon(
    TANGRAM_SHAPES_BY_TYPE[type] ?? TANGRAM_SHAPES_BY_TYPE.smallTriangle,
    { x: 0, y: 0, rotation, flip },
    1
  );
  const mirroredPolygon = sourcePolygon.map((point) => mirrorPoint(point, variant));
  const flipOptions = type === "parallelogram" ? [false, true] : [false];

  for (const candidateFlip of flipOptions) {
    for (let candidateRotation = 0; candidateRotation < 8; candidateRotation += 1) {
      const candidatePolygon = transformTangramPolygon(
        TANGRAM_SHAPES_BY_TYPE[type] ?? TANGRAM_SHAPES_BY_TYPE.smallTriangle,
        { x: 0, y: 0, rotation: candidateRotation, flip: candidateFlip },
        1
      );
      if (pointSetsEqual(mirroredPolygon, candidatePolygon)) {
        return {
          rotation: candidateRotation,
          flip: candidateFlip
        };
      }
    }
  }

  return {
    rotation: normalizeRotationSteps(rotation),
    flip: Boolean(flip)
  };
};

const createMirroredTemplate = (template, variant) => {
  if (variant.id === "base") return template;

  return {
    id: `${template.id}-${variant.id}`,
    label: {
      es: `${template.label.es}${variant.labelEs}`,
      en: `${template.label.en}${variant.labelEn}`
    },
    poses: template.poses.map((pose, index) => {
      const type = SLOT_TYPES_BY_INDEX[index];
      const orientation = resolveMirroredOrientation(type, pose.rotation, pose.flip, variant);
      return {
        x: variant.mirrorX ? -pose.x : pose.x,
        y: variant.mirrorY ? -pose.y : pose.y,
        rotation: orientation.rotation,
        flip: orientation.flip
      };
    })
  };
};

const EXPANDED_TEMPLATE_POSES = Object.freeze(
  BASE_TEMPLATE_POSES.flatMap((template) =>
    MIRROR_VARIANTS.map((variant) => createMirroredTemplate(template, variant))
  )
);

const BASE_TEMPLATES = Object.freeze(
  EXPANDED_TEMPLATE_POSES.map((template) => ({
    ...template,
    slots: template.poses.map((pose, index) => ({
      slotId: `${template.id}-${index + 1}`,
      type: SLOT_TYPES_BY_INDEX[index],
      x: pose.x,
      y: pose.y,
      rotation: normalizeRotationSteps(pose.rotation),
      flip: Boolean(pose.flip)
    }))
  }))
);

const rotateSlot = (slot, rotationSteps) => {
  const [nextX, nextY] = rotatePointBySteps([slot.x, slot.y], rotationSteps);
  return {
    ...slot,
    x: Number(nextX.toFixed(4)),
    y: Number(nextY.toFixed(4)),
    rotation: normalizeRotationSteps(slot.rotation + rotationSteps)
  };
};

export const buildTangramChallenge = (matchId, locale = "es") => {
  const safeMatchId = Math.max(0, Number(matchId) || 0);
  const templateIndex = safeMatchId % BASE_TEMPLATES.length;
  const rotationVariant = (Math.floor(safeMatchId / BASE_TEMPLATES.length) % 4) * 2;
  const baseTemplate = BASE_TEMPLATES[templateIndex];
  const challengeLabel = baseTemplate.label?.[locale] ?? baseTemplate.label?.en ?? baseTemplate.id;
  const slots = baseTemplate.slots.map((slot) => rotateSlot(slot, rotationVariant));

  return {
    id: `${baseTemplate.id}-r${rotationVariant}`,
    baseId: baseTemplate.id,
    label: challengeLabel,
    rotationVariant,
    slots
  };
};

export const getBoardPoseFromSlot = (
  slot,
  boardConfig = TANGRAM_BOARD_CONFIG
) => ({
  x: boardConfig.targetCenterX + slot.x * boardConfig.scale,
  y: boardConfig.targetCenterY + slot.y * boardConfig.scale,
  rotation: normalizeRotationSteps(slot.rotation),
  flip: Boolean(slot.flip)
});

export const getBoardSlotsForChallenge = (
  challenge,
  boardConfig = TANGRAM_BOARD_CONFIG
) => challenge.slots.map((slot) => ({ slot, pose: getBoardPoseFromSlot(slot, boardConfig) }));

const ROTATION_PERIOD_BY_TYPE = Object.freeze({
  square: 2,
  parallelogram: 4
});

export const doesPieceRotationMatchSlot = (pieceType, pieceRotation, slotRotation) => {
  const delta = normalizeRotationSteps(pieceRotation - slotRotation);
  const period = ROTATION_PERIOD_BY_TYPE[pieceType] ?? 8;
  return delta % period === 0;
};

const createSeededRandom = (seed) => {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const BASE_TRAY_OFFSETS = Object.freeze([
  [-140, -140],
  [-140, 118],
  [-36, -18],
  [74, -150],
  [74, 122],
  [172, -44],
  [168, 132]
]);

export const buildInitialTangramPieces = (
  matchId,
  boardConfig = TANGRAM_BOARD_CONFIG
) => {
  const random = createSeededRandom((Number(matchId) || 0) + 31);
  return TANGRAM_PIECES.map((piece, index) => {
    const offset = BASE_TRAY_OFFSETS[index];
    const jitterX = (random() - 0.5) * 18;
    const jitterY = (random() - 0.5) * 18;
    return {
      ...piece,
      x: boardConfig.trayCenterX + offset[0] + jitterX,
      y: boardConfig.trayCenterY + offset[1] + jitterY,
      rotation: Math.floor(random() * 8),
      flip: piece.type === "parallelogram" ? random() < 0.5 : false,
      locked: false,
      targetSlotId: null
    };
  });
};

export const buildSolvedTangramPieces = (
  challenge,
  boardConfig = TANGRAM_BOARD_CONFIG
) => {
  const slotPool = challenge.slots.reduce((accumulator, slot) => {
    if (!accumulator[slot.type]) accumulator[slot.type] = [];
    accumulator[slot.type].push(slot);
    return accumulator;
  }, {});

  return TANGRAM_PIECES.map((piece) => {
    const slot = slotPool[piece.type]?.shift();
    const pose = slot ? getBoardPoseFromSlot(slot, boardConfig) : { x: 0, y: 0, rotation: 0, flip: false };
    return {
      ...piece,
      ...pose,
      locked: Boolean(slot),
      targetSlotId: slot?.slotId ?? null
    };
  });
};

export const findSnapCandidateForPiece = (
  piece,
  challenge,
  occupiedSlotIds,
  boardConfig = TANGRAM_BOARD_CONFIG
) => {
  const occupied = occupiedSlotIds ?? new Set();
  let bestCandidate = null;

  for (const slot of challenge.slots) {
    if (slot.type !== piece.type) continue;
    if (occupied.has(slot.slotId)) continue;

    const pose = getBoardPoseFromSlot(slot, boardConfig);
    const distance = Math.hypot(piece.x - pose.x, piece.y - pose.y);
    if (distance > boardConfig.snapDistance) continue;
    if (!doesPieceRotationMatchSlot(piece.type, piece.rotation, pose.rotation)) continue;
    if (piece.type === "parallelogram" && Boolean(piece.flip) !== Boolean(pose.flip)) continue;

    if (!bestCandidate || distance < bestCandidate.distance) {
      bestCandidate = { slot, pose, distance };
    }
  }

  return bestCandidate;
};

export const formatTangramElapsed = (milliseconds) => {
  const safeMs = Math.max(0, Number(milliseconds) || 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
