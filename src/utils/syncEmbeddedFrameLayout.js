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
  const mobileShellViewport = frame?.closest?.(".mobile-game-shell__stage-viewport");
  const isMobileShellEmbed = Boolean(
    mobileShellViewport?.closest?.(".mobile-game-shell")
  );
  const shouldUseCompactEmbed = isMobileShellEmbed;

  [root, body].forEach((node) => {
    node.classList.toggle("mobile-shell-embed", shouldUseCompactEmbed);
    node.classList.toggle(
      "mobile-shell-portrait",
      shouldUseCompactEmbed && orientation === "portrait"
    );
    node.classList.toggle(
      "mobile-shell-landscape",
      shouldUseCompactEmbed && orientation === "landscape"
    );

    if (shouldUseCompactEmbed) {
      node.setAttribute("data-mobile-shell-game", String(gameId ?? ""));
      node.style.setProperty("--mobile-shell-width", `${width}px`);
      node.style.setProperty("--mobile-shell-height", `${height}px`);
      return;
    }

    node.removeAttribute("data-mobile-shell-game");
    node.style.removeProperty("--mobile-shell-width");
    node.style.removeProperty("--mobile-shell-height");
  });
}
