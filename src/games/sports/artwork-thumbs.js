/**
 * Display copies of the football artwork (scripts/build-manager-thumbnails.mjs):
 * WebP at 64 and 192 px of every crest, trophy and league logo. The original
 * file stays the fallback when a copy is missing.
 */
const THUMBED = /^\/assets\/football\/(crests|trophies|competitions)\/([^/?#]+)$/;

/** The small copy of `src` for something drawn `px` CSS pixels wide, or null. */
export function thumbFor(src, px = 64) {
  const match = THUMBED.exec(src || '');
  if (!match) return null;
  return `/assets/football/thumbs/${match[1]}/${match[2]}.${px <= 32 ? 64 : 192}.webp`;
}
