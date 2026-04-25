import React, { useEffect, useMemo, useRef, useState } from "react";

const EMPTY_LIST = [];

function tokenizeClassName(className) {
  return String(className ?? "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractBodyHtml(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  return bodyHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").trim();
}

function extractInlineBlocks(html, tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  return [...html.matchAll(regex)].map((match) => match[1]).filter(Boolean);
}

function normalizeStandaloneCss(cssText) {
  const embeddedHtmlToken = "__EMBEDDED_HTML__";
  const embeddedBodyToken = "__EMBEDDED_BODY__";
  let normalizedCss = cssText
    .replace(/:root/g, ":host")
    .replace(/\bhtml\b/g, embeddedHtmlToken)
    .replace(/\bbody\b/g, embeddedBodyToken)
    .replace(new RegExp(embeddedHtmlToken, "g"), "#embedded-body")
    .replace(new RegExp(embeddedBodyToken, "g"), "#embedded-body")
    .replace(/\b100(?:d|s|l)?vh\b/g, "100%")
    .replace(/\b100(?:d|s|l)?vw\b/g, "100%");

  let previousCss = "";
  while (normalizedCss !== previousCss) {
    previousCss = normalizedCss;
    normalizedCss = normalizedCss
      .replace(
        /((?:\.[-\w]+|\[[^\]]+\]|:[-\w()]+)+)\s+#embedded-body\b/g,
        "#embedded-body$1"
      )
      .replace(
        /#embedded-body([^,{]*?)\s*>\s*#embedded-body([^,{]*)/g,
        "#embedded-body$1$2"
      )
      .replace(
        /#embedded-body([^,{]*?)\s+#embedded-body([^,{]*)/g,
        "#embedded-body$1$2"
      );
  }

  return normalizedCss;
}

function createScopedDocument({ hostElement, bodyElement, shadowRoot, cleanup }) {
  const ownerDocument = hostElement.ownerDocument;

  const documentProxy = {
    get activeElement() {
      return ownerDocument.activeElement;
    },
    get body() {
      return bodyElement;
    },
    get currentScript() {
      return null;
    },
    get documentElement() {
      return bodyElement;
    },
    get fullscreenElement() {
      return ownerDocument.fullscreenElement;
    },
    get head() {
      return shadowRoot;
    },
    get hidden() {
      return ownerDocument.hidden;
    },
    get readyState() {
      return "complete";
    },
    get visibilityState() {
      return ownerDocument.visibilityState;
    },
    addEventListener(type, listener, options) {
      if (type === "DOMContentLoaded" || type === "readystatechange") {
        queueMicrotask(() => {
          if (typeof listener === "function") {
            listener(new Event(type));
          } else {
            listener?.handleEvent?.(new Event(type));
          }
        });
        return;
      }
      ownerDocument.addEventListener(type, listener, options);
      cleanup.documentListeners.push({ type, listener, options });
    },
    removeEventListener(type, listener, options) {
      ownerDocument.removeEventListener(type, listener, options);
    },
    createElement(tagName, options) {
      return ownerDocument.createElement(tagName, options);
    },
    createElementNS(namespace, tagName, options) {
      return ownerDocument.createElementNS(namespace, tagName, options);
    },
    createTextNode(data) {
      return ownerDocument.createTextNode(data);
    },
    dispatchEvent(event) {
      return ownerDocument.dispatchEvent(event);
    },
    exitFullscreen() {
      return ownerDocument.exitFullscreen?.();
    },
    getElementById(id) {
      return shadowRoot.getElementById(id);
    },
    querySelector(selector) {
      return shadowRoot.querySelector(selector);
    },
    querySelectorAll(selector) {
      return shadowRoot.querySelectorAll(selector);
    },
    webkitExitFullscreen() {
      return ownerDocument.webkitExitFullscreen?.();
    },
  };

  return documentProxy;
}

function createScopedWindow({ documentProxy, cleanup }) {
  const realWindow = window;
  const overrides = {
    addEventListener(type, listener, options) {
      realWindow.addEventListener(type, listener, options);
      cleanup.windowListeners.push({ type, listener, options });
    },
    clearInterval(id) {
      cleanup.intervals.delete(id);
      return realWindow.clearInterval(id);
    },
    clearTimeout(id) {
      cleanup.timeouts.delete(id);
      return realWindow.clearTimeout(id);
    },
    cancelAnimationFrame(id) {
      cleanup.rafs.delete(id);
      return realWindow.cancelAnimationFrame(id);
    },
    document: documentProxy,
    removeEventListener(type, listener, options) {
      realWindow.removeEventListener(type, listener, options);
    },
    requestAnimationFrame(callback) {
      const id = realWindow.requestAnimationFrame(callback);
      cleanup.rafs.add(id);
      return id;
    },
    setInterval(callback, delay, ...args) {
      const id = realWindow.setInterval(callback, delay, ...args);
      cleanup.intervals.add(id);
      return id;
    },
    setTimeout(callback, delay, ...args) {
      const id = realWindow.setTimeout(callback, delay, ...args);
      cleanup.timeouts.add(id);
      return id;
    },
  };

  const proxy = new Proxy(realWindow, {
    get(target, prop) {
      if (prop in overrides) {
        return overrides[prop];
      }
      if (prop === "globalThis" || prop === "self" || prop === "window") {
        return proxy;
      }
      const value = target[prop];
      return typeof value === "function" ? value.bind(target) : value;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });

  return proxy;
}

// Bare identifiers like `requestAnimationFrame(loop)` or `setInterval(...)`
// inside a `new Function(...)` body resolve against the real global, not the
// `window` parameter — so they bypass the scoped proxy and their ids are
// never tracked for cleanup. Shadow them with function-local vars so embedded
// scripts route through the proxy's tracked versions without changes.
const SCOPED_GLOBAL_PROLOGUE = [
  "var requestAnimationFrame = window.requestAnimationFrame;",
  "var cancelAnimationFrame = window.cancelAnimationFrame;",
  "var setTimeout = window.setTimeout;",
  "var clearTimeout = window.clearTimeout;",
  "var setInterval = window.setInterval;",
  "var clearInterval = window.clearInterval;",
].join("\n");

// Top-level `function foo(){}` declarations inside `new Function(...)` stay
// local to the runner, so inline HTML handlers like `onclick="foo()"` (which
// resolve against the real `window`) can't see them. Extract column-0 names
// and append `window.foo = foo` lines so those handlers work, tracking the
// names for cleanup on unmount.
function extractTopLevelFunctionNames(source) {
  const names = new Set();
  const re = /^function\s+([A-Za-z_$][\w$]*)/gm;
  let match;
  while ((match = re.exec(source)) !== null) {
    names.add(match[1]);
  }
  return [...names];
}

function runStandaloneScript(source, scopedWindow, documentProxy, exposedNames) {
  const topLevelNames = extractTopLevelFunctionNames(source);
  const exposeEpilogue = topLevelNames
    .map((name) => `try{window.${name}=${name};}catch(e){}`)
    .join("\n");
  const runner = new Function(
    "window",
    "document",
    "globalThis",
    "self",
    `${SCOPED_GLOBAL_PROLOGUE}\n${source}\n${exposeEpilogue}\n//# sourceURL=embedded-standalone-game.js`
  );
  runner(scopedWindow, documentProxy, scopedWindow, scopedWindow);
  for (const name of topLevelNames) {
    exposedNames.add(name);
  }
}

function syncEmbeddedBodyClassName(
  bodyElement,
  nextExternalClassTokens,
  appliedExternalClassTokensRef,
  isSyncingBodyClassRef
) {
  const appliedExternalClassSet = new Set(appliedExternalClassTokensRef.current);
  const runtimeClassTokens = tokenizeClassName(bodyElement.className).filter(
    (token) => !appliedExternalClassSet.has(token)
  );
  const nextClassName = [...runtimeClassTokens, ...nextExternalClassTokens].join(" ");

  appliedExternalClassTokensRef.current = nextExternalClassTokens;
  if (bodyElement.className === nextClassName) {
    return false;
  }

  isSyncingBodyClassRef.current = true;
  bodyElement.className = nextClassName;
  isSyncingBodyClassRef.current = false;
  return true;
}

function dispatchEmbeddedLayoutSync(bodyElement) {
  const win = bodyElement?.ownerDocument?.defaultView;
  if (!win) {
    return;
  }

  win.requestAnimationFrame(() => {
    win.dispatchEvent(new win.Event("resize"));
  });
}

function syncEmbeddedHostSizeVars(hostElement, bodyElement) {
  if (!hostElement || !bodyElement) {
    return;
  }

  const width = Math.max(0, hostElement.clientWidth || hostElement.offsetWidth || 0);
  const height = Math.max(0, hostElement.clientHeight || hostElement.offsetHeight || 0);

  bodyElement.style.setProperty("--mobile-shell-width", `${width}px`);
  bodyElement.style.setProperty("--mobile-shell-height", `${height}px`);
}

export default function StandaloneHtmlGameHost({
  className = "",
  bodyClassName = "",
  html,
  scripts = EMPTY_LIST,
  styles = EMPTY_LIST,
}) {
  const hostRef = useRef(null);
  const bodyElementRef = useRef(null);
  const bodyClassTokensRef = useRef(tokenizeClassName(bodyClassName));
  const appliedBodyClassTokensRef = useRef(tokenizeClassName(bodyClassName));
  const isSyncingBodyClassRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const parsed = useMemo(
    () => ({
      bodyHtml: extractBodyHtml(html),
      inlineScripts: extractInlineBlocks(html, "script"),
      inlineStyles: extractInlineBlocks(html, "style"),
    }),
    [html]
  );

  useEffect(() => {
    const nextBodyClassTokens = tokenizeClassName(bodyClassName);
    bodyClassTokensRef.current = nextBodyClassTokens;

    const bodyElement = bodyElementRef.current;
    if (!bodyElement) {
      appliedBodyClassTokensRef.current = nextBodyClassTokens;
      return;
    }

    const classNameChanged = syncEmbeddedBodyClassName(
      bodyElement,
      nextBodyClassTokens,
      appliedBodyClassTokensRef,
      isSyncingBodyClassRef
    );
    if (classNameChanged) {
      dispatchEmbeddedLayoutSync(bodyElement);
    }
  }, [bodyClassName]);

  useEffect(() => {
    const hostElement = hostRef.current;
    if (!hostElement) {
      return undefined;
    }

    const shadowRoot = hostElement.shadowRoot ?? hostElement.attachShadow({ mode: "open" });
    const cleanup = {
      documentListeners: [],
      exposedNames: new Set(),
      intervals: new Set(),
      rafs: new Set(),
      timeouts: new Set(),
      windowListeners: [],
    };
    const previousBridge = {
      advanceTime: window.advanceTime,
      renderGameToText: window.render_game_to_text,
    };

    shadowRoot.innerHTML = "";
    const baseStyle = document.createElement("style");
    baseStyle.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      #embedded-body {
        display: block;
        width: 100%;
        height: 100%;
      }
    `;
    shadowRoot.appendChild(baseStyle);

    for (const cssText of [...parsed.inlineStyles, ...styles]) {
      const styleTag = document.createElement("style");
      styleTag.textContent = normalizeStandaloneCss(cssText);
      shadowRoot.appendChild(styleTag);
    }

    const bodyElement = document.createElement("div");
    bodyElement.id = "embedded-body";
    bodyElement.innerHTML = parsed.bodyHtml;
    shadowRoot.appendChild(bodyElement);
    bodyElementRef.current = bodyElement;
    syncEmbeddedHostSizeVars(hostElement, bodyElement);
    syncEmbeddedBodyClassName(
      bodyElement,
      bodyClassTokensRef.current,
      appliedBodyClassTokensRef,
      isSyncingBodyClassRef
    );
    const bodyClassObserver = new MutationObserver(() => {
      if (isSyncingBodyClassRef.current) {
        return;
      }
      syncEmbeddedBodyClassName(
        bodyElement,
        bodyClassTokensRef.current,
        appliedBodyClassTokensRef,
        isSyncingBodyClassRef
      );
    });
    bodyClassObserver.observe(bodyElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const hostSizeObserver = new ResizeObserver(() => {
      syncEmbeddedHostSizeVars(hostElement, bodyElement);
      dispatchEmbeddedLayoutSync(bodyElement);
    });
    hostSizeObserver.observe(hostElement);

    const documentProxy = createScopedDocument({
      hostElement,
      bodyElement,
      shadowRoot,
      cleanup,
    });
    const scopedWindow = createScopedWindow({ cleanup, documentProxy });

    try {
      for (const source of [...parsed.inlineScripts, ...scripts]) {
        runStandaloneScript(source, scopedWindow, documentProxy, cleanup.exposedNames);
      }
      setIsReady(true);
    } catch (error) {
      console.error("Failed to boot standalone embedded game", error);
      setIsReady(false);
    }

    return () => {
      bodyClassObserver.disconnect();
      hostSizeObserver.disconnect();
      bodyElementRef.current = null;
      for (const { type, listener, options } of cleanup.windowListeners) {
        window.removeEventListener(type, listener, options);
      }
      for (const { type, listener, options } of cleanup.documentListeners) {
        document.removeEventListener(type, listener, options);
      }
      for (const id of cleanup.timeouts) {
        window.clearTimeout(id);
      }
      for (const id of cleanup.intervals) {
        window.clearInterval(id);
      }
      for (const id of cleanup.rafs) {
        window.cancelAnimationFrame(id);
      }

      if (window.render_game_to_text !== previousBridge.renderGameToText) {
        window.render_game_to_text = previousBridge.renderGameToText;
      }
      if (window.advanceTime !== previousBridge.advanceTime) {
        window.advanceTime = previousBridge.advanceTime;
      }

      for (const name of cleanup.exposedNames) {
        try {
          delete window[name];
        } catch (e) {
          window[name] = undefined;
        }
      }

      shadowRoot.innerHTML = "";
    };
  }, [parsed.bodyHtml, parsed.inlineScripts, parsed.inlineStyles, scripts, styles]);

  return (
    <>
      {!isReady ? <div className="arcade-neon-rush-loading">Loading...</div> : null}
      <div ref={hostRef} className={className} />
    </>
  );
}
