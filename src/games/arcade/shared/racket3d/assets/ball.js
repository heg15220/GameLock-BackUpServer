// The two balls.
//
// Both are driven straight from the physics state — position *and* orientation.
// The orientation is the part that matters and the part that is usually faked:
// spin is the whole strategic content of both sports, and a ball that does not
// visibly rotate at its real ω hides the one thing the player most needs to read.
// So we integrate the actual angular velocity into the mesh's quaternion, and a
// heavy topspin lob *looks* like a heavy topspin lob before it ever lands.

import * as THREE from "three";
import { feltTexture, feltNormalTexture, pingBallTexture } from "./textures";

const SEGMENTS = { high: 32, medium: 24, low: 16 };

// The classic tennis seam.  With a + b = 1 and c = 2√(ab) this curve lies exactly
// on the unit sphere — no projection, no drift, no seam floating off the felt.
class SeamCurve extends THREE.Curve {
  constructor(radius) {
    super();
    this.radius = radius;
  }

  getPoint(t, target = new THREE.Vector3()) {
    const u = t * Math.PI * 2;
    const a = 0.7;
    const b = 0.3;
    const c = 2 * Math.sqrt(a * b);
    return target
      .set(
        a * Math.cos(u) + b * Math.cos(3 * u),
        c * Math.sin(2 * u),
        a * Math.sin(u) - b * Math.sin(3 * u),
      )
      .multiplyScalar(this.radius);
  }
}

// A speed streak, as a ring buffer of past positions.  It is additive and fades to
// black at the tail, so the tail costs nothing and needs no per-vertex alpha.
function createTrail(length, color) {
  const positions = new Float32Array(length * 3);
  const colors = new Float32Array(length * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setDrawRange(0, 0);

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;

  const tint = new THREE.Color(color);
  const points = [];

  return {
    line,
    push(x, y, z) {
      points.push(x, y, z);
      if (points.length > length * 3) points.splice(0, points.length - length * 3);

      const count = points.length / 3;
      for (let i = 0; i < count; i += 1) {
        positions[i * 3] = points[i * 3];
        positions[i * 3 + 1] = points[i * 3 + 1];
        positions[i * 3 + 2] = points[i * 3 + 2];

        // Oldest sample is darkest; the head of the streak is the ball itself.
        const fade = (i / Math.max(1, count - 1)) ** 2;
        colors[i * 3] = tint.r * fade;
        colors[i * 3 + 1] = tint.g * fade;
        colors[i * 3 + 2] = tint.b * fade;
      }

      geometry.setDrawRange(0, count);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
    clear() {
      points.length = 0;
      geometry.setDrawRange(0, 0);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

// On the low tier there is no shadow map, so the ball projects a disc instead.  A
// ball with no shadow reads as floating, and the height of the bounce becomes
// impossible to judge — this is the cheapest possible fix for that, not a frill.
function createBlobShadow(radius) {
  const geometry = new THREE.CircleGeometry(radius * 2.2, 12);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  return { mesh, material, geometry };
}

function assemble({ tier, radius, mesh, extraMeshes = [], trailColor, trailSpeed, floorY }) {
  const group = new THREE.Group();

  const spinner = new THREE.Group(); // carries the rotation; the group carries the position
  spinner.add(mesh);
  for (const extra of extraMeshes) spinner.add(extra);
  group.add(spinner);

  const useBlob = tier.shadows === "blob";
  mesh.castShadow = !useBlob;
  mesh.receiveShadow = false;

  const blob = useBlob ? createBlobShadow(radius) : null;
  const trail = tier.ballTrail > 0 ? createTrail(tier.ballTrail, trailColor) : null;

  const axis = new THREE.Vector3();
  const spin = new THREE.Quaternion();

  return {
    object3D: group,
    blob: blob?.mesh ?? null,
    trail: trail?.line ?? null,

    // `ball` is the physics state (aero.js): x/y/z, vx/vy/vz, wx/wy/wz.
    update(ball, dt) {
      group.position.set(ball.x, ball.y, ball.z);

      const rate = Math.hypot(ball.wx, ball.wy, ball.wz);
      if (rate > 1e-4) {
        axis.set(ball.wx / rate, ball.wy / rate, ball.wz / rate);
        spin.setFromAxisAngle(axis, rate * dt);
        spinner.quaternion.premultiply(spin);
      }

      if (blob) {
        blob.mesh.position.set(ball.x, floorY + 0.002, ball.z);
        // Higher ball, larger and fainter blob: the only depth cue the low tier gets.
        const height = Math.max(0, ball.y - floorY);
        const spread = 1 + height * 0.8;
        blob.mesh.scale.setScalar(spread);
        blob.material.opacity = 0.3 / spread;
      }

      if (trail) {
        const speed = Math.hypot(ball.vx, ball.vy, ball.vz);
        if (speed > trailSpeed) trail.push(ball.x, ball.y, ball.z);
        else trail.clear();
      }
    },

    reset() {
      trail?.clear();
      spinner.quaternion.identity();
    },

    dispose() {
      mesh.geometry.dispose();
      mesh.material.dispose();
      for (const extra of extraMeshes) {
        extra.geometry.dispose();
        extra.material.dispose();
      }
      trail?.dispose();
      blob?.geometry.dispose();
      blob?.material.dispose();
    },
  };
}

export function createTennisBall(tier, { radius = 0.0335, floorY = 0 } = {}) {
  const segments = SEGMENTS[tier.id] ?? SEGMENTS.medium;

  const felt = new THREE.Mesh(
    new THREE.SphereGeometry(radius, segments, segments),
    new THREE.MeshStandardMaterial({
      map: feltTexture(),
      normalMap: feltNormalTexture(),
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.96,
      metalness: 0,
    }),
  );

  // The seam sits a hair proud of the felt, as it does on a real ball.
  const seam = new THREE.Mesh(
    new THREE.TubeGeometry(new SeamCurve(radius * 1.005), segments * 3, radius * 0.05, 6, true),
    new THREE.MeshStandardMaterial({ color: 0xf3f5ef, roughness: 0.8, metalness: 0 }),
  );
  seam.castShadow = false;

  return assemble({
    tier,
    radius,
    mesh: felt,
    extraMeshes: [seam],
    trailColor: 0xd8e94a,
    trailSpeed: 22, // ~80 km/h: a rally ball streaks, a drop shot does not
    floorY,
  });
}

export function createPingPongBall(tier, { radius = 0.02, floorY = 0 } = {}) {
  const segments = SEGMENTS[tier.id] ?? SEGMENTS.medium;

  // Celluloid: smooth, bright, and the printed logo is what makes 100 rev/s legible.
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(radius, segments, segments),
    new THREE.MeshStandardMaterial({
      map: pingBallTexture(),
      roughness: 0.32,
      metalness: 0.02,
    }),
  );

  return assemble({
    tier,
    radius,
    mesh: ball,
    trailColor: 0xfff6e0,
    trailSpeed: 9, // a looped ball leaves a streak; a push stroke stays clean
    floorY,
  });
}
