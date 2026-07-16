// The WebGL renderer, its resize contract, and its teardown.
//
// Isolated here so the two games' scenes never touch renderer state, and so the
// one thing a long-lived game must get right — releasing every buffer and texture
// it allocated when the player leaves — happens in exactly one place.

import * as THREE from "three";

export function isWebGLAvailable() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export function createRenderer(canvas, tier) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: tier.antialias,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false,
  });

  renderer.setClearColor(0x05070d, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  applyTier(renderer, tier);
  return renderer;
}

export function applyTier(renderer, tier) {
  if (tier.shadows === "soft") {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } else if (tier.shadows === "hard") {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
  } else {
    renderer.shadowMap.enabled = false;
  }
  renderer.shadowMap.needsUpdate = true;
}

// Sizes the drawing buffer to the element, with the pixel ratio clamped by the
// tier.  A phone at devicePixelRatio 3 would otherwise be asked to shade nine
// times the pixels of a desktop for no visible gain.
export function resizeRenderer(renderer, camera, canvas, tier) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 960));
  const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 540));
  const ratio = Math.min(window.devicePixelRatio || 1, tier.maxPixelRatio);

  renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);

  if (camera) {
    camera.aspect = width / height;
    // A narrow phone in portrait needs a wider vertical FOV or the court runs off
    // the top and bottom of the screen.
    camera.fov = camera.aspect < 1 ? 62 : camera.aspect < 1.5 ? 52 : 45;
    camera.updateProjectionMatrix();
  }

  return { width, height };
}

// Frees everything the scene allocated.  three.js does not garbage-collect GPU
// resources, and a game the player enters and leaves a dozen times will leak the
// whole arena each time if this is skipped.
export function disposeScene(root) {
  root.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    const material = object.material;
    if (!material) return;
    const materials = Array.isArray(material) ? material : [material];
    for (const m of materials) {
      for (const key of Object.keys(m)) {
        const value = m[key];
        if (value && value.isTexture) value.dispose();
      }
      m.dispose();
    }
  });
}
