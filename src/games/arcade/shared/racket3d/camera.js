// Perspective camera + painter's-algorithm helpers shared by the racket sports
// (tennis, table tennis).  Pinhole model: world -> camera (yaw, then pitch) ->
// perspective divide.  Generalised from the basketball-court projection so both
// games can place a free camera anywhere and look at any target.
//
// World convention (both games):
//   +X = right (from the player's point of view, looking down the court)
//   +Y = up
//   +Z = away from the player, toward the opponent

export function createCamera({ pos, lookAt, fovScale = 0.86 }) {
  const fx = lookAt.x - pos.x;
  const fy = lookAt.y - pos.y;
  const fz = lookAt.z - pos.z;
  const horiz = Math.sqrt(fx * fx + fz * fz);
  return {
    x: pos.x,
    y: pos.y,
    z: pos.z,
    yaw: Math.atan2(fx, fz),
    pitch: Math.atan2(fy, horiz || 1e-6),
    fovScale,
  };
}

// Returns null when the point is behind (or too close to) the near plane, so
// callers must null-check before drawing.
export function project(cam, wx, wy, wz, vW, vH) {
  const dx = wx - cam.x;
  const dy = wy - cam.y;
  const dz = wz - cam.z;

  const cosY = Math.cos(cam.yaw);
  const sinY = Math.sin(cam.yaw);
  const rx = -dx * cosY + dz * sinY; // right component
  const rz = dx * sinY + dz * cosY;  // forward depth

  const cosP = Math.cos(cam.pitch);
  const sinP = Math.sin(cam.pitch);
  const pz = rz * cosP + dy * sinP;
  const py = -rz * sinP + dy * cosP;

  if (pz <= 0.05) return null;

  const f = vH * cam.fovScale;
  return {
    x: vW / 2 + (rx * f) / pz,
    y: vH / 2 - (py * f) / pz,
    depth: pz,
  };
}

export function line3D(ctx, cam, vW, vH, a, b) {
  const pa = project(cam, a[0], a[1], a[2], vW, vH);
  const pb = project(cam, b[0], b[1], b[2], vW, vH);
  if (!pa || !pb) return false;
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  return true;
}

// Fills a convex polygon given as an array of [x, y, z] world points.  Any
// vertex behind the camera drops the whole face — acceptable because every
// surface in these scenes is small relative to the view frustum.
export function fillPoly3D(ctx, cam, vW, vH, points, style) {
  const projected = [];
  for (const p of points) {
    const q = project(cam, p[0], p[1], p[2], vW, vH);
    if (!q) return null;
    projected.push(q);
  }
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let i = 1; i < projected.length; i += 1) {
    ctx.lineTo(projected[i].x, projected[i].y);
  }
  ctx.closePath();
  if (style) {
    ctx.fillStyle = style;
    ctx.fill();
  }
  return projected;
}

export function polyDepth(cam, points) {
  let sum = 0;
  for (const p of points) {
    const dx = p[0] - cam.x;
    const dy = p[1] - cam.y;
    const dz = p[2] - cam.z;
    sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return sum / points.length;
}

// Collects faces and flushes them back-to-front.  Cheap stand-in for a depth
// buffer; enough because these scenes are a few dozen large quads.
export function createPainter(cam) {
  const faces = [];
  return {
    add(points, style, stroke = null) {
      faces.push({ points, style, stroke, depth: polyDepth(cam, points) });
    },
    flush(ctx, vW, vH) {
      faces.sort((a, b) => b.depth - a.depth);
      for (const face of faces) {
        const projected = fillPoly3D(ctx, cam, vW, vH, face.points, face.style);
        if (projected && face.stroke) {
          ctx.strokeStyle = face.stroke.color;
          ctx.lineWidth = face.stroke.width ?? 1;
          ctx.stroke();
        }
      }
      faces.length = 0;
    },
  };
}

// Radius in screen pixels of a sphere of world radius r at world point p.
export function projectRadius(cam, p, r, vW, vH) {
  const centre = project(cam, p.x, p.y, p.z, vW, vH);
  if (!centre) return null;
  const f = vH * cam.fovScale;
  return { ...centre, r: Math.max(1.2, (r * f) / centre.depth) };
}
