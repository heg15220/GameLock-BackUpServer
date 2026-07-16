// The tennis racket.
//
// Local frame, and the rest of the engine depends on it: the butt of the handle is
// at the origin, +Y runs up the shaft to the head, and +Z is the face normal — the
// same +Z that physics/contact.js resolves the impulse against.  Get this wrong and
// the ball leaves at right angles to the swing.
//
// The string bed is real geometry, 16 mains × 19 crosses, and it *gives* when the
// ball arrives.  That deflection is the only visual evidence the player gets that
// they found the sweet spot or missed it, so it is driven by the same off-centre
// distance the contact solver uses to dock the restitution.

import * as THREE from "three";

const LENGTH = 0.685;       // 27 in, the legal maximum and what everyone plays with
const HEAD_A = 0.1275;      // half-width of the hoop
const HEAD_B = 0.165;       // half-height
const HEAD_Y = LENGTH - HEAD_B;
const FRAME_THICKNESS = 0.023;
const GRIP_LENGTH = 0.20;
const GRIP_RADIUS = 0.0155;

const MAINS = 16;
const CROSSES = 19;

export const RACKET_GEOMETRY = { LENGTH, HEAD_A, HEAD_B, HEAD_Y };

function frameMesh(material) {
  // The hoop: an outer ellipse with an inner ellipse punched out of it, extruded
  // through the face.  ExtrudeGeometry treats holes properly, so the beam has a
  // real cross-section rather than being a flat ring.
  const shape = new THREE.Shape();
  shape.ellipse(0, 0, HEAD_A, HEAD_B, 0, Math.PI * 2, false, 0);

  const hole = new THREE.Path();
  hole.ellipse(0, 0, HEAD_A - 0.011, HEAD_B - 0.011, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: FRAME_THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2,
    curveSegments: 48,
  });
  // Extrusion runs along +Z from 0; recentre it on the face plane.
  geometry.translate(0, 0, -FRAME_THICKNESS / 2);
  geometry.translate(0, HEAD_Y, 0);

  return new THREE.Mesh(geometry, material);
}

function handleMesh() {
  // A turned profile: the butt flares into a cap, the grip swells slightly, the
  // shaft narrows where it meets the throat.
  const profile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(GRIP_RADIUS * 1.35, 0.0),
    new THREE.Vector2(GRIP_RADIUS * 1.35, 0.008),
    new THREE.Vector2(GRIP_RADIUS * 1.02, 0.018),
    new THREE.Vector2(GRIP_RADIUS, 0.10),
    new THREE.Vector2(GRIP_RADIUS * 1.04, GRIP_LENGTH - 0.02),
    new THREE.Vector2(GRIP_RADIUS * 0.82, GRIP_LENGTH),
    new THREE.Vector2(0.0, GRIP_LENGTH),
  ];

  // Octagonal, because a tennis grip is octagonal and you can feel it in your hand
  // even when you cannot see it.
  const geometry = new THREE.LatheGeometry(profile, 8);
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.88, metalness: 0.02 }),
  );
}

function overgripMesh() {
  // The spiral of tape, wound bottom to top with an overlap.
  const turns = 11;
  const points = [];
  for (let i = 0; i <= turns * 24; i += 1) {
    const t = i / (turns * 24);
    const angle = t * turns * Math.PI * 2;
    const y = 0.012 + t * (GRIP_LENGTH - 0.03);
    points.push(new THREE.Vector3(
      Math.cos(angle) * GRIP_RADIUS * 1.06,
      y,
      Math.sin(angle) * GRIP_RADIUS * 1.06,
    ));
  }

  const geometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points), turns * 24, 0.0026, 4, false,
  );
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0x2f333a, roughness: 0.95 }),
  );
}

function throatMesh(material) {
  // Two struts from the top of the grip out to the bottom of the hoop.
  const bottom = HEAD_Y - HEAD_B;
  const shape = new THREE.Shape();
  shape.moveTo(-0.014, GRIP_LENGTH - 0.01);
  shape.lineTo(0.014, GRIP_LENGTH - 0.01);
  shape.lineTo(0.052, bottom + 0.02);
  shape.lineTo(0.030, bottom + 0.026);
  shape.lineTo(0.0, GRIP_LENGTH + 0.10);
  shape.lineTo(-0.030, bottom + 0.026);
  shape.lineTo(-0.052, bottom + 0.02);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: FRAME_THICKNESS,
    bevelEnabled: false,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -FRAME_THICKNESS / 2);

  return new THREE.Mesh(geometry, material);
}

// Where each string sits, in the head's own coordinates.  Mains run along Y, crosses
// along X, and both are cut to the ellipse — which is why the corner strings are
// short and the centre ones long, exactly as on a strung frame.
function stringLayout() {
  const strings = [];
  const a = HEAD_A - 0.013;
  const b = HEAD_B - 0.013;

  for (let i = 0; i < MAINS; i += 1) {
    const x = ((i + 0.5) / MAINS - 0.5) * 2 * a;
    const half = b * Math.sqrt(Math.max(0, 1 - (x / a) ** 2));
    if (half < 0.01) continue;
    strings.push({ x, y: 0, length: half * 2, vertical: true });
  }

  for (let j = 0; j < CROSSES; j += 1) {
    const y = ((j + 0.5) / CROSSES - 0.5) * 2 * b;
    const half = a * Math.sqrt(Math.max(0, 1 - (y / b) ** 2));
    if (half < 0.01) continue;
    strings.push({ x: 0, y, length: half * 2, vertical: false });
  }

  return strings;
}

function stringBed(tier) {
  if (!tier.stringBed) {
    // Low tier: one translucent panel standing in for 35 strings.  It still catches
    // the light, and it still flexes — it just cannot show you the weave.
    const geometry = new THREE.CircleGeometry(1, 24);
    geometry.scale(HEAD_A - 0.013, HEAD_B - 0.013, 1);
    geometry.translate(0, HEAD_Y, 0);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: 0xe8e8e0,
      roughness: 0.6,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
    }));
    return { mesh, instanced: false };
  }

  const layout = stringLayout();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xf0f0e6, roughness: 0.35, metalness: 0.1,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, layout.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const gauge = 0.0013; // 1.30 mm, a normal polyester gauge
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  // The rest pose, kept so every frame's deflection is measured from the same place
  // instead of accumulating.
  const rest = layout.map((s) => ({
    x: s.x,
    y: HEAD_Y + s.y,
    sx: s.vertical ? gauge : s.length,
    sy: s.vertical ? s.length : gauge,
  }));

  const write = (depth) => {
    for (let i = 0; i < rest.length; i += 1) {
      const s = rest[i];
      position.set(s.x, s.y, depth(s.x, s.y - HEAD_Y));
      scale.set(s.sx, s.sy, gauge);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  write(() => 0);

  return { mesh, instanced: true, write };
}

export function createRacket(tier, { color = 0x101418 } = {}) {
  const group = new THREE.Group();

  // Frame and throat are one piece of graphite in real life, and one material here.
  const graphite = new THREE.MeshStandardMaterial({
    color, roughness: 0.42, metalness: 0.55,
  });

  const frame = frameMesh(graphite);
  const throat = throatMesh(graphite);

  const handle = handleMesh();
  const overgrip = overgripMesh();
  const bed = stringBed(tier);

  const parts = [frame, throat, handle, overgrip, bed.mesh];
  for (const part of parts) {
    part.castShadow = tier.shadows !== "blob";
    group.add(part);
  }

  // Impact state: a struck string bed rings and settles, it does not snap back.
  let flexDepth = 0;      // metres of deflection at the impact point, along -Z
  let flexX = 0;
  let flexY = 0;
  const SETTLE = 26;      // 1/s — a string bed is stiff and heavily damped

  return {
    object3D: group,

    // Called by the scene when contact.js reports a hit.  `offCentre` is the same
    // radial miss distance the solver used to reduce the restitution, so a shanked
    // ball visibly craters the frame's edge and a clean one dimples the middle.
    strike({ x = 0, y = 0, speed = 30, offCentre = 0 } = {}) {
      flexX = x;
      flexY = y;
      // Deeper for a faster ball, shallower for one caught off the sweet spot: the
      // strings cannot store energy they never received.
      flexDepth = Math.min(0.028, speed * 0.0006) * (1 - Math.min(0.6, offCentre * 2.5));
    },

    update(dt) {
      if (!bed.instanced) return;
      if (flexDepth <= 1e-5) return;

      flexDepth = Math.max(0, flexDepth - flexDepth * SETTLE * dt);
      const depth = flexDepth;

      // A gaussian bowl centred on the impact: the strings near the ball travel, the
      // ones out by the grommets barely move because the frame holds them.
      bed.write((x, y) => {
        const d2 = (x - flexX) ** 2 + (y - flexY) ** 2;
        return -depth * Math.exp(-d2 / 0.0032);
      });

      if (flexDepth <= 1e-5) bed.write(() => 0);
    },

    dispose() {
      // Frame and throat share a material; a Set keeps us from disposing it twice.
      const materials = new Set();
      for (const part of parts) {
        part.geometry.dispose();
        materials.add(part.material);
      }
      for (const material of materials) material.dispose();
    },
  };
}
