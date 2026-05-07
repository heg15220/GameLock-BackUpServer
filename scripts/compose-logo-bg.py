"""Compose the GameLock logo over a backdrop matching the hero card palette.

- Diagonal 135 deg gradient: #ffffff -> #eef5ff (surface -> surface-2)
- Soft radial lime accent (top-right): rgba(198, 255, 0, 0.18)
- Soft radial cyan accent (bottom-left): rgba(0, 229, 195, 0.14)

The logo's icon and text are not touched - only the previously transparent
pixels are replaced by the gradient backdrop.
"""
import os
import shutil
import numpy as np
from PIL import Image

BRAND_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "brand")
LOGO_PATH = os.path.normpath(os.path.join(BRAND_DIR, "gamelock-logo.png"))
TRANSPARENT_BACKUP = os.path.normpath(os.path.join(BRAND_DIR, "gamelock-logo-transparent.png"))


def hex_rgb(s):
    s = s.lstrip("#")
    return np.array([int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)], dtype=np.float32)


def build_backdrop(width, height):
    surface = hex_rgb("#ffffff")
    surface_2 = hex_rgb("#eef5ff")
    lime = hex_rgb("#c6ff00")
    cyan = hex_rgb("#00e5c3")

    xs = np.arange(width, dtype=np.float32)
    ys = np.arange(height, dtype=np.float32)
    X, Y = np.meshgrid(xs, ys)

    # Diagonal 135deg gradient: linear interpolation from top-left to bottom-right
    t = (X + Y) / max(1.0, (width + height - 2))
    t = np.clip(t, 0.0, 1.0)[..., None]  # (H, W, 1)
    bg = surface * (1.0 - t) + surface_2 * t

    def radial(cx, cy, radius, color, max_alpha):
        d = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
        falloff = np.clip(1.0 - d / radius, 0.0, 1.0)
        # Smoothstep keeps the tint contained near the corner instead of bleeding
        falloff = falloff * falloff * (3.0 - 2.0 * falloff)
        alpha = (falloff * max_alpha)[..., None]
        return color * alpha + bg * (1.0 - alpha), alpha

    diag = float(max(width, height))

    # Lime radial in upper-right (corner-bound, very subtle)
    bg, _ = radial(width * 0.98, 0.0, diag * 0.45, lime, 0.22)
    # Cyan radial in lower-left (corner-bound, very subtle)
    bg, _ = radial(0.0, float(height), diag * 0.5, cyan, 0.18)

    bg = np.clip(bg, 0.0, 255.0).astype(np.uint8)
    alpha = np.full((height, width, 1), 255, dtype=np.uint8)
    return np.concatenate([bg, alpha], axis=2)


def key_out_white(logo_arr):
    """Convert near-white pixels to transparent so the backdrop shows through.

    The source PNG ships with a flat white background (alpha=255 everywhere),
    so we synthesize a soft mask from per-pixel "whiteness" (min channel) to
    preserve antialiased edges around the icon and text glyphs.
    """
    rgb = logo_arr[..., :3].astype(np.float32)
    whiteness = rgb.min(axis=2)  # 255 = fully white, lower = colored
    # Smoothly fade from opaque (whiteness=230) to transparent (whiteness=252).
    lo, hi = 230.0, 252.0
    t = np.clip((whiteness - lo) / (hi - lo), 0.0, 1.0)
    smooth = t * t * (3.0 - 2.0 * t)
    alpha = (1.0 - smooth) * 255.0
    out = logo_arr.copy()
    out[..., 3] = alpha.astype(np.uint8)
    return out


def main():
    if os.path.exists(TRANSPARENT_BACKUP):
        source_path = TRANSPARENT_BACKUP
    else:
        source_path = LOGO_PATH
        shutil.copyfile(LOGO_PATH, TRANSPARENT_BACKUP)
        print(f"backup -> {TRANSPARENT_BACKUP}")

    logo = Image.open(source_path).convert("RGBA")
    width, height = logo.size

    logo_arr = np.array(logo)
    keyed_arr = key_out_white(logo_arr)
    keyed = Image.fromarray(keyed_arr)

    backdrop_arr = build_backdrop(width, height)
    backdrop = Image.fromarray(backdrop_arr)

    composed = Image.alpha_composite(backdrop, keyed)
    composed.save(LOGO_PATH, optimize=True)
    print(f"wrote   -> {LOGO_PATH}  ({width}x{height})")


if __name__ == "__main__":
    main()
