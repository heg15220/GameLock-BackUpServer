const injected = new Map();

export function loadScriptOnce(key, src, attrs = {}) {
  if (typeof document === "undefined" || injected.has(key) || !src) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = src;

  Object.entries(attrs).forEach(([name, value]) => {
    if (value == null || value === false) return;
    script.setAttribute(name, value === true ? "" : String(value));
  });

  document.head.appendChild(script);
  injected.set(key, { el: script });
}

export function insertRawScriptOnce(key, code) {
  if (typeof document === "undefined" || injected.has(key) || !code) return;

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.text = code;

  document.head.appendChild(script);
  injected.set(key, { el: script });
}

export function unloadScript(key) {
  const item = injected.get(key);
  if (!item) return;

  try {
    item.el.remove();
    if (typeof item.cleanup === "function") {
      item.cleanup();
    }
  } catch {
    // Script cleanup must not break consent updates.
  }

  injected.delete(key);
}

export function unloadAllByPrefix(prefix) {
  Array.from(injected.keys())
    .filter((key) => key.startsWith(prefix))
    .forEach(unloadScript);
}
