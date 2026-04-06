export function syncEmbeddedFrameLayout(frame, gameId) {
  const doc = frame?.contentDocument;
  const body = doc?.body;
  const root = doc?.documentElement;

  if (!body || !root) {
    return;
  }

  const width = Math.max(0, frame.clientWidth || frame.offsetWidth || 0);
  const height = Math.max(0, frame.clientHeight || frame.offsetHeight || 0);
  const orientation = height >= width ? "portrait" : "landscape";

  [root, body].forEach((node) => {
    node.classList.add("mobile-shell-embed");
    node.classList.toggle("mobile-shell-portrait", orientation === "portrait");
    node.classList.toggle("mobile-shell-landscape", orientation === "landscape");
    node.setAttribute("data-mobile-shell-game", String(gameId ?? ""));
    node.style.setProperty("--mobile-shell-width", `${width}px`);
    node.style.setProperty("--mobile-shell-height", `${height}px`);
  });
}
