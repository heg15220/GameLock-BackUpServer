const DEG_TO_RAD = Math.PI / 180;
const MIN_POINT_GAP = 70;
const STRAIGHT_STEP_MM = 220;
const ARC_STEP_MM = 170;

const bcmStraight = (lengthMm) => [0, lengthMm];
const bcmLeft = (angleDeg, radiusMm) => [Math.abs(angleDeg), radiusMm];
const bcmRight = (angleDeg, radiusMm) => [-Math.abs(angleDeg), radiusMm];
const bcmAutoCurveLeft = () => [1, 0];
const bcmAutoCurveRight = () => [-1, 0];
const bcmAutoStraight = () => [0, 0];

function appendPoint(points, x, y) {
  const last = points[points.length - 1];
  if (!last || Math.hypot(last[0] - x, last[1] - y) >= MIN_POINT_GAP) {
    points.push([x, y]);
  }
}

function normalizePositiveDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function forwardVector(heading) {
  return [Math.cos(heading), Math.sin(heading)];
}

function leftVector(heading) {
  return [-Math.sin(heading), Math.cos(heading)];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

function scale(vector, factor) {
  return [vector[0] * factor, vector[1] * factor];
}

function advanceTurn(point, heading, signedAngleDeg, radiusMm) {
  const turnDirection = Math.sign(signedAngleDeg);
  const arcAngle = Math.abs(signedAngleDeg) * DEG_TO_RAD;
  const centerX = point[0] - Math.sin(heading) * radiusMm * turnDirection;
  const centerY = point[1] + Math.cos(heading) * radiusMm * turnDirection;
  const startAngle = Math.atan2(point[1] - centerY, point[0] - centerX);
  const endAngle = startAngle + arcAngle * turnDirection;
  return [
    centerX + Math.cos(endAngle) * radiusMm,
    centerY + Math.sin(endAngle) * radiusMm,
  ];
}

function simulateTramos(origin, tramos, withPoints = true) {
  let x = origin[0];
  let y = origin[1];
  let heading = Math.atan2(origin[3], origin[2]);
  const points = withPoints ? [[x, y]] : null;

  for (const [tipo, magnitude] of tramos) {
    if (tipo === 0) {
      const steps = Math.max(1, Math.ceil(magnitude / STRAIGHT_STEP_MM));
      for (let step = 1; step <= steps; step += 1) {
        const distance = (magnitude * step) / steps;
        if (withPoints) {
          appendPoint(points, x + Math.cos(heading) * distance, y + Math.sin(heading) * distance);
        }
      }
      x += Math.cos(heading) * magnitude;
      y += Math.sin(heading) * magnitude;
      continue;
    }

    const turnDirection = Math.sign(tipo);
    const arcAngle = Math.abs(tipo) * DEG_TO_RAD;
    const radius = magnitude;
    const centerX = x - Math.sin(heading) * radius * turnDirection;
    const centerY = y + Math.cos(heading) * radius * turnDirection;
    const startAngle = Math.atan2(y - centerY, x - centerX);
    const steps = Math.max(3, Math.ceil((radius * arcAngle) / ARC_STEP_MM));

    for (let step = 1; step <= steps; step += 1) {
      const theta = startAngle + (arcAngle * step * turnDirection) / steps;
      if (withPoints) {
        appendPoint(points, centerX + Math.cos(theta) * radius, centerY + Math.sin(theta) * radius);
      }
    }

    const endAngle = startAngle + arcAngle * turnDirection;
    x = centerX + Math.cos(endAngle) * radius;
    y = centerY + Math.sin(endAngle) * radius;
    heading += arcAngle * turnDirection;
  }

  return { x, y, heading, points: points || [] };
}

function solveRadius(evalCandidate) {
  let best = null;
  let minRadius = 80;
  let maxRadius = 3200;
  let step = 40;

  for (let pass = 0; pass < 4; pass += 1) {
    for (let radius = minRadius; radius <= maxRadius; radius += step) {
      const candidate = evalCandidate(radius);
      if (!candidate) {
        continue;
      }
      if (!best || candidate.score < best.score) {
        best = candidate;
      }
    }
    if (!best) {
      return null;
    }
    minRadius = Math.max(40, best.radius - step);
    maxRadius = best.radius + step;
    step /= 4;
  }

  return best;
}

function solveAutoClose(origin, tramos) {
  if (tramos.length < 2) {
    return tramos;
  }

  const penultimate = tramos[tramos.length - 2];
  const last = tramos[tramos.length - 1];
  const fixedTramos = tramos.slice(0, -2);
  const fixedState = simulateTramos(origin, fixedTramos, false);
  const currentPoint = [fixedState.x, fixedState.y];
  const currentHeading = fixedState.heading;
  const startPoint = [origin[0], origin[1]];
  const startHeading = Math.atan2(origin[3], origin[2]);
  const headingDeltaDeg = (startHeading - currentHeading) / DEG_TO_RAD;
  const remainingAngleFor = (sign) => {
    const positive = normalizePositiveDegrees(headingDeltaDeg);
    const negative = normalizePositiveDegrees(-headingDeltaDeg);
    const remaining = sign > 0 ? positive : negative;
    return remaining < 1 ? 360 : remaining;
  };

  if (penultimate[0] === 0 && last[1] === 0 && Math.abs(last[0]) === 1) {
    const curveSign = Math.sign(last[0]);
    const curveAngleDeg = remainingAngleFor(curveSign);
    const best = solveRadius((radius) => {
      const curveStartHeading = startHeading - curveSign * curveAngleDeg * DEG_TO_RAD;
      const center = add(startPoint, scale(leftVector(startHeading), curveSign * radius));
      const curveStart = subtract(center, scale(leftVector(curveStartHeading), curveSign * radius));
      const ray = subtract(curveStart, currentPoint);
      const straightLength = dot(ray, forwardVector(currentHeading));
      const perpendicularError = dot(ray, leftVector(currentHeading));
      if (straightLength < 0) {
        return null;
      }
      return {
        radius,
        straightLength,
        score: Math.abs(perpendicularError) + Math.max(0, 80 - straightLength) * 5,
      };
    });

    if (best) {
      return [
        ...fixedTramos,
        [0, best.straightLength],
        [curveSign * curveAngleDeg, best.radius],
      ];
    }
  }

  if (Math.abs(penultimate[0]) === 1 && penultimate[1] === 0 && last[0] === 0) {
    const curveSign = Math.sign(penultimate[0]);
    const curveAngleDeg = remainingAngleFor(curveSign);
    const best = solveRadius((radius) => {
      const curveEnd = advanceTurn(currentPoint, currentHeading, curveSign * curveAngleDeg, radius);
      const ray = subtract(startPoint, curveEnd);
      const straightLength = dot(ray, forwardVector(startHeading));
      const perpendicularError = dot(ray, leftVector(startHeading));
      if (straightLength < 0) {
        return null;
      }
      return {
        radius,
        straightLength,
        score: Math.abs(perpendicularError) + Math.max(0, 80 - straightLength) * 5,
      };
    });

    if (best) {
      return [
        ...fixedTramos,
        [curveSign * curveAngleDeg, best.radius],
        [0, best.straightLength],
      ];
    }
  }

  return tramos;
}

function compileBlueprint(blueprint) {
  if (Array.isArray(blueprint.raw) && blueprint.raw.length >= 4) {
    const raw = [];
    for (const point of blueprint.raw) {
      appendPoint(raw, point[0], point[1]);
    }
    if (
      raw.length > 2 &&
      Math.hypot(raw[0][0] - raw[raw.length - 1][0], raw[0][1] - raw[raw.length - 1][1]) < MIN_POINT_GAP
    ) {
      raw.pop();
    }
    return {
      ...blueprint,
      tramos: blueprint.tramos ?? [],
      raw,
    };
  }

  const solvedTramos = solveAutoClose(blueprint.origin, blueprint.tramos);
  const { x, y, points } = simulateTramos(blueprint.origin, solvedTramos, true);
  const startX = blueprint.origin[0];
  const startY = blueprint.origin[1];
  const endGap = Math.hypot(x - startX, y - startY);

  if (endGap > 1) {
    appendPoint(points, startX, startY);
  }
  if (
    points.length > 2 &&
    Math.hypot(points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]) < MIN_POINT_GAP
  ) {
    points.pop();
  }

  return {
    ...blueprint,
    tramos: solvedTramos,
    raw: points,
  };
}

const BLUEPRINTS = [
  {
    id: 0,
    envId: "neon-city",
    name: { es: "Costa Azul GP", en: "Azure Coast GP" },
    classification: { es: "Semipermanente", en: "Semi-permanent" },
    layoutLabel: { es: "Tecnico lento", en: "Slow technical" },
    note: {
      es: "Trazado compacto de muchas curvas lentas y medias, basado en el modelo de tramos del motor basic-circuit-maker.",
      en: "Compact layout with many slow and medium-speed corners, built from the basic-circuit-maker segment model.",
    },
    distanceKm: "4.2 km",
    turns: 14,
    overtaking: { es: "Baja", en: "Low" },
    profile: { es: "Carga alta", en: "High downforce" },
    poleSide: "left",
    trackWidth: 66,
    startS: 0.018,
    dimensionsMm: [5000, 2000],
    origin: [1130, 360, 1, 0],
    tramos: [
      bcmStraight(2740),
      bcmLeft(210, 650),
      bcmStraight(878),
      bcmRight(60, 570),
      bcmAutoStraight(),
      bcmAutoCurveLeft(),
    ],
  },
  {
    id: 1,
    envId: "volcano",
    name: { es: "Sierra Verde GP", en: "Sierra Verde GP" },
    classification: { es: "Permanente", en: "Permanent" },
    layoutLabel: { es: "Power lap", en: "Power lap" },
    note: {
      es: "Circuito de potencia con una recta principal larga, frenadas serias y un cierre rapido de apoyo.",
      en: "Power circuit with a long main straight, hard braking zones, and a quick support-based final sector.",
    },
    distanceKm: "4.6 km",
    turns: 10,
    overtaking: { es: "Alta", en: "High" },
    profile: { es: "Carga media-baja", en: "Medium-low downforce" },
    poleSide: "right",
    trackWidth: 74,
    startS: 0.018,
    dimensionsMm: [4000, 2000],
    origin: [1420, 200, 1, 0],
    tramos: [
      bcmStraight(1800),
      bcmLeft(140, 530),
      bcmStraight(750),
      bcmLeft(95, 500),
      bcmRight(83, 500),
      bcmStraight(700),
      bcmLeft(45, 520),
      bcmLeft(100, 500),
      bcmAutoStraight(),
      bcmAutoCurveLeft(),
    ],
  },
  {
    id: 2,
    envId: "arctic",
    name: { es: "Nordhaven Ring", en: "Nordhaven Ring" },
    classification: { es: "Costero", en: "Coastal" },
    layoutLabel: { es: "Stop-go", en: "Stop-go" },
    note: {
      es: "Dos rectas largas, angulos rectos y cierre automatico con el mismo esquema de tramos del repositorio base.",
      en: "Two long straights, right-angle braking zones, and an auto-closed layout built with the same segment scheme as the source repository.",
    },
    distanceKm: "4.9 km",
    turns: 8,
    overtaking: { es: "Alta", en: "High" },
    profile: { es: "Traccion y frenada", en: "Traction and braking" },
    poleSide: "left",
    trackWidth: 72,
    startS: 0.02,
    dimensionsMm: [5400, 2400],
    origin: [1000, 340, 1, 0],
    tramos: [
      bcmStraight(1600),
      bcmLeft(90, 260),
      bcmStraight(500),
      bcmLeft(90, 260),
      bcmStraight(1500),
      bcmLeft(90, 260),
      bcmAutoCurveLeft(),
      bcmAutoStraight(),
    ],
  },
  {
    id: 3,
    envId: "jungle",
    name: { es: "Emerald Forest GP", en: "Emerald Forest GP" },
    classification: { es: "Permanente", en: "Permanent" },
    layoutLabel: { es: "Flow rapido", en: "Fast flow" },
    note: {
      es: "Secuencia enlazada de apoyos y cambios de direccion rapidos, inspirada en layouts de alta velocidad sin cruces.",
      en: "Linked sequence of support corners and quick direction changes, inspired by high-speed layouts without self-crossings.",
    },
    distanceKm: "5.2 km",
    turns: 13,
    overtaking: { es: "Media", en: "Medium" },
    profile: { es: "Carga media", en: "Medium downforce" },
    poleSide: "left",
    trackWidth: 70,
    startS: 0.018,
    dimensionsMm: [5000, 2500],
    origin: [1000, 280, -1, 0],
    tramos: [
      bcmRight(90, 700),
      bcmStraight(750),
      bcmRight(190, 500),
      bcmStraight(310),
      bcmLeft(100, 500),
      bcmStraight(20),
      bcmLeft(6, 700),
      bcmRight(17, 700),
      bcmLeft(22, 700),
      bcmRight(22, 700),
      bcmLeft(22, 700),
      bcmRight(22, 700),
      bcmLeft(22, 700),
      bcmRight(17, 700),
      bcmLeft(6, 700),
      bcmStraight(20),
      bcmLeft(207, 500),
      bcmStraight(950),
      bcmRight(207, 520),
      bcmStraight(1250),
      bcmRight(40, 1300),
      bcmRight(20, 720),
      bcmRight(10, 480),
      bcmRight(10, 1000),
      bcmRight(10, 1000),
      bcmRight(25, 1300),
      bcmAutoCurveRight(),
      bcmAutoStraight(),
    ],
  },
  {
    id: 4,
    envId: "desert",
    name: { es: "Sol Dunes Speedway", en: "Sol Dunes Speedway" },
    classification: { es: "Speedway", en: "Speedway" },
    layoutLabel: { es: "Oval", en: "Oval" },
    note: {
      es: "Oval puro de largas aceleraciones con dos curvas constantes y mucha estela.",
      en: "Pure oval with long acceleration zones, constant banking and heavy slipstreaming.",
    },
    distanceKm: "4.1 km",
    turns: 4,
    overtaking: { es: "Muy alta", en: "Very high" },
    profile: { es: "Baja carga", en: "Low downforce" },
    poleSide: "left",
    trackWidth: 86,
    startS: 0.02,
    dimensionsMm: [3000, 2000],
    origin: [1070, 430, 1, 0],
    tramos: [
      bcmStraight(860),
      bcmLeft(180, 570),
      bcmAutoStraight(),
      bcmAutoCurveLeft(),
    ],
  },
  {
    id: 5,
    envId: "space",
    name: { es: "Capital Grand Prix", en: "Capital Grand Prix" },
    classification: { es: "Grand Prix", en: "Grand Prix" },
    layoutLabel: { es: "Modern GP", en: "Modern GP" },
    note: {
      es: "Layout largo y moderno con primer sector tecnico, parte central enlazada y retorno amplio a la recta.",
      en: "Long modern layout with a technical first sector, linked middle section, and a broad return onto the straight.",
    },
    distanceKm: "5.7 km",
    turns: 17,
    overtaking: { es: "Media-alta", en: "Medium-high" },
    profile: { es: "Balanceado", en: "Balanced" },
    poleSide: "right",
    trackWidth: 72,
    startS: 0.018,
    dimensionsMm: [7000, 2000],
    origin: [4200, 200, 1, 0],
    tramos: [
      bcmStraight(2000),
      bcmLeft(165, 530),
      bcmStraight(700),
      bcmLeft(90, 480),
      bcmRight(75, 600),
      bcmRight(60, 480),
      bcmStraight(750),
      bcmLeft(45, 520),
      bcmLeft(115, 480),
      bcmRight(145, 480),
      bcmStraight(1200),
      bcmLeft(170, 500),
      bcmLeft(55, 1900),
      bcmStraight(1000),
      bcmLeft(30, 480),
      bcmRight(60, 480),
      bcmAutoCurveLeft(),
      bcmAutoStraight(),
    ],
  },
  {
    id: 6,
    envId: "space",
    name: { es: "Altura Real Loop", en: "Royal Altitude Loop" },
    classification: { es: "Gran Premio", en: "Grand Prix" },
    layoutLabel: { es: "Trazado largo", en: "Long layout" },
    note: {
      es: "Recta superior larga, horquilla exterior, diagonal de retorno y sector bajo revirado.",
      en: "Long upper straight, outer hairpin, diagonal return, and a twistier lower sector.",
    },
    distanceKm: "6.4 km",
    turns: 21,
    overtaking: { es: "Media-alta", en: "Medium-high" },
    profile: { es: "Carga media-alta", en: "Medium-high downforce" },
    poleSide: "left",
    trackWidth: 72,
    startS: 0.02,
    dimensionsMm: [8600, 4600],
    raw: [
      [4700, 720],
      [5750, 700],
      [6600, 640],
      [7350, 330],
      [8000, 500],
      [8120, 960],
      [7420, 1280],
      [6550, 2100],
      [5400, 2670],
      [5080, 2920],
      [4920, 2740],
      [3660, 2790],
      [2580, 2760],
      [2310, 3180],
      [2110, 3900],
      [1800, 4320],
      [970, 4240],
      [350, 4310],
      [190, 4130],
      [980, 3260],
      [920, 2820],
      [720, 2120],
      [1020, 1120],
      [1500, 880],
      [1740, 760],
      [1810, 520],
      [2520, 390],
      [3640, 300],
      [4520, 360],
    ],
  },
  {
    id: 7,
    envId: "jungle",
    name: { es: "Serpentina Club", en: "Serpentine Club" },
    classification: { es: "Club permanente", en: "Permanent club" },
    layoutLabel: { es: "Tecnico estrecho", en: "Narrow technical" },
    note: {
      es: "Trazado compacto y estrecho con recta inferior muy larga, cambios de cota visuales y una secuencia superior de eses cerradas.",
      en: "Compact narrow layout with a very long lower straight, visual elevation changes, and a tight upper esses sequence.",
    },
    distanceKm: "4.8 km",
    turns: 18,
    overtaking: { es: "Media", en: "Medium" },
    profile: { es: "Traccion y precision", en: "Traction and precision" },
    poleSide: "right",
    trackWidth: 66,
    startS: 0.03,
    dimensionsMm: [6600, 3200],
    raw: [
      [620, 2900],
      [2050, 2910],
      [3820, 2900],
      [5450, 2880],
      [6200, 2660],
      [6460, 2280],
      [6260, 1790],
      [5700, 1500],
      [5550, 960],
      [5200, 700],
      [4860, 930],
      [5110, 1540],
      [4660, 1780],
      [4050, 1250],
      [3860, 640],
      [3450, 550],
      [3040, 1040],
      [2600, 1060],
      [1640, 880],
      [950, 780],
      [1180, 1250],
      [2600, 1550],
      [2980, 1800],
      [2540, 1990],
      [1150, 1960],
      [650, 1800],
      [520, 1260],
      [250, 1320],
      [520, 2450],
    ],
  },
  {
    id: 8,
    envId: "neon-city",
    name: { es: "Tri-Sector DRS", en: "Tri-Sector DRS" },
    classification: { es: "Gran Premio moderno", en: "Modern Grand Prix" },
    layoutLabel: { es: "Rectas DRS", en: "DRS straights" },
    note: {
      es: "Mapa grande con tres sectores claros: recta principal larga, loop tecnico a la izquierda y retorno diagonal de alta velocidad.",
      en: "Large map with three clear sectors: long main straight, technical left loop, and high-speed diagonal return.",
    },
    distanceKm: "6.8 km",
    turns: 14,
    overtaking: { es: "Alta", en: "High" },
    profile: { es: "Balanceado", en: "Balanced" },
    poleSide: "left",
    trackWidth: 76,
    startS: 0.02,
    dimensionsMm: [8800, 3600],
    raw: [
      [6760, 3300],
      [4520, 3300],
      [2220, 3300],
      [1460, 3300],
      [1250, 2920],
      [980, 2600],
      [740, 2100],
      [680, 1550],
      [950, 1050],
      [1500, 920],
      [2450, 930],
      [2750, 1180],
      [2700, 1450],
      [1980, 1580],
      [1880, 1810],
      [2500, 2260],
      [3300, 2550],
      [4100, 2540],
      [4350, 2260],
      [4380, 1980],
      [4800, 1220],
      [5200, 680],
      [5750, 620],
      [6500, 1050],
      [7300, 1450],
      [8120, 1640],
      [8460, 2200],
      [8430, 2920],
      [8050, 3300],
    ],
  },
  {
    id: 9,
    envId: "desert",
    name: { es: "Puerto Norte Park", en: "North Harbor Park" },
    classification: { es: "Permanente tecnico", en: "Technical permanent" },
    layoutLabel: { es: "Curvas enlazadas", en: "Linked corners" },
    note: {
      es: "Inspirado en mapas de circuitos reales con pit straight largo, primera curva amplia, sector central vertical y horquilla de regreso.",
      en: "Inspired by real circuit maps with a long pit straight, broad first corner, vertical middle sector, and a return hairpin.",
    },
    distanceKm: "5.9 km",
    turns: 14,
    overtaking: { es: "Media", en: "Medium" },
    profile: { es: "Carga media", en: "Medium downforce" },
    poleSide: "right",
    trackWidth: 72,
    startS: 0.015,
    dimensionsMm: [8800, 4400],
    raw: [
      [5450, 3340],
      [4200, 3340],
      [2850, 3340],
      [1250, 3340],
      [1120, 3150],
      [1550, 2850],
      [2250, 2600],
      [3600, 2600],
      [3820, 2400],
      [3600, 2150],
      [3350, 1820],
      [3150, 1020],
      [3030, 540],
      [3300, 240],
      [4200, 240],
      [5000, 360],
      [5060, 680],
      [5620, 1120],
      [6150, 1380],
      [6680, 1050],
      [7150, 1120],
      [7420, 1720],
      [7820, 2240],
      [8350, 2440],
      [8500, 2870],
      [8420, 3500],
      [7800, 3460],
      [7100, 3350],
      [6650, 3330],
      [6400, 3550],
      [6620, 3850],
      [7600, 3820],
      [7900, 4050],
      [7700, 4320],
      [6000, 4260],
      [5600, 3820],
    ],
  },
];

export const RACE2DPRO_CIRCUITS = BLUEPRINTS.map(compileBlueprint);
