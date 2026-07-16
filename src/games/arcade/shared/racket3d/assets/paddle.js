// The table tennis paddle.
//
// Same local frame contract as the racket: butt of the handle at the origin, +Y up
// the shaft, +Z the face normal that physics/contact.js resolves against.  A paddle
// is the simpler object of the two but the more consequential one, because its two
// faces are not the same surface — inverted red on one side, pips on the other — and
// the rubber it lands on is what decides how much of the swing becomes spin.
//
// The blade barely flexes (it is 6 mm of plywood, not a string bed), so the give at
// contact is a compression of the sponge: shallow, fast, and worth showing because
// it is the only frame where you can see the ball actually bite.

import * as THREE from "three";
import { woodTexture, rubberTexture } from "./textures";

const BLADE_R = 0.0765;          // ~153 mm across the face
const BLADE_THICKNESS = 0.006;   // 6 mm of plywood
const RUBBER_THICKNESS = 0.004;  // sponge + topsheet, each side
const HANDLE_LENGTH = 0.10;
const HANDLE_WIDTH = 0.025;
const BLADE_Y = HANDLE_LENGTH + BLADE_R * 0.86;

export const PADDLE_GEOMETRY = { BLADE_R, BLADE_Y, HANDLE_LENGTH };

// The face is not a circle: it is a circle that has been pulled slightly along the
// shaft, which is why a real blade looks like an egg and not a lollipop.
function faceGeometry(radius, segments = 40) {
  const geometry = new THREE.CircleGeometry(radius, segments);
  geometry.scale(1, 1.06, 1);
  return geometry;
}

function bladeMesh() {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, BLADE_R, BLADE_R * 1.06, 0, Math.PI * 2, false, 0);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: BLADE_THICKNESS,
    bevelEnabled: true,
    bevelThickness: 0.0008,
    bevelSize: 0.0008,
    bevelSegments: 1,
    curveSegments: 40,
  });
  geometry.translate(0, 0, -BLADE_THICKNESS / 2);
  geometry.translate(0, BLADE_Y, 0);

  // The edge of the blade is the one place the laminate is visible end-on.
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: woodTexture(),
      roughness: 0.55,
      metalness: 0,
    }),
  );
}

// A rubber sheet, laid on one face of the blade.  `pips` picks the pimpled sheet,
// which by convention is the black side.
function rubberMesh(color, pips, side) {
  const geometry = faceGeometry(BLADE_R * 0.985, 40);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: rubberTexture(color, pips),
      roughness: pips ? 0.86 : 0.7,
      metalness: 0,
      side: THREE.FrontSide,
    }),
  );

  mesh.position.set(0, BLADE_Y, side * (BLADE_THICKNESS / 2 + RUBBER_THICKNESS / 2));
  if (side < 0) mesh.rotation.y = Math.PI; // so the sheet faces outward, not into the wood
  return mesh;
}

function handleMesh() {
  // Flared and waisted: a real handle is narrow in the middle so the hand locks onto
  // it, and it is that waist, not the shape of the blade, that you feel when you grip.
  const profile = [];
  const steps = 14;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const y = t * HANDLE_LENGTH;
    // Waisted: wide at the butt, pinched at 40%, widening again into the blade.
    const waist = 1 - 0.24 * Math.sin(Math.min(1, t / 0.55) * Math.PI);
    profile.push(new THREE.Vector2((HANDLE_WIDTH / 2) * waist, y));
  }
  profile.unshift(new THREE.Vector2(0, 0));
  profile.push(new THREE.Vector2(0, HANDLE_LENGTH));

  const geometry = new THREE.LatheGeometry(profile, 14);
  // Flatten it: a paddle handle is an oval in cross-section, not a dowel.
  geometry.scale(1, 1, 0.52);

  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: woodTexture(),
      color: 0xb07a4a,
      roughness: 0.7,
      metalness: 0,
    }),
  );
}

export function createPaddle(tier, { redFacesForward = true } = {}) {
  const group = new THREE.Group();

  const blade = bladeMesh();
  const handle = handleMesh();

  // Whichever rubber the player is hitting with today faces +Z, so the physics side
  // and the visual side agree about which surface met the ball.
  const front = rubberMesh(redFacesForward ? "#c02b2b" : "#161616", !redFacesForward, +1);
  const back = rubberMesh(redFacesForward ? "#161616" : "#c02b2b", redFacesForward, -1);

  const parts = [blade, handle, front, back];
  for (const part of parts) {
    part.castShadow = tier.shadows !== "blob";
    group.add(part);
  }

  // The sponge compresses on impact and rebounds within a couple of frames.
  let squash = 0;
  const SETTLE = 34; // 1/s — faster than a string bed; there is far less to damp

  return {
    object3D: group,

    strike({ speed = 20, offCentre = 0 } = {}) {
      // Sponge bottoms out: past a certain pace it cannot compress any further, and
      // that ceiling is exactly why a hard smash feels dead in the hand.
      const bite = 1 - Math.min(0.6, offCentre * 3);
      squash = Math.min(0.5, speed * 0.014) * bite;
    },

    update(dt) {
      if (squash <= 1e-4) return;
      squash = Math.max(0, squash - squash * SETTLE * dt);

      // The sheet dishes inward and spreads a little, as rubber under load does.
      const dip = squash * RUBBER_THICKNESS;
      front.position.z = BLADE_THICKNESS / 2 + RUBBER_THICKNESS / 2 - dip;
      front.scale.setScalar(1 + squash * 0.02);
    },

    dispose() {
      const materials = new Set();
      for (const part of parts) {
        part.geometry.dispose();
        materials.add(part.material);
      }
      for (const material of materials) material.dispose();
    },
  };
}
