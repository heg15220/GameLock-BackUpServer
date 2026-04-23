import React, { useEffect, useMemo, useRef, useState } from "react";

const EMPTY_LIST = [];

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
  return cssText
    .replace(/:root/g, ":host")
    .replace(/\bhtml\b/g, "#embedded-body")
    .replace(/\bbody\b/g, "#embedded-body");
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

function runStandaloneScript(source, scopedWindow, documentProxy) {
  const runner = new Function(
    "window",
    "document",
    "globalThis",
    "self",
    `${source}\n//# sourceURL=embedded-standalone-game.js`
  );
  runner(scopedWindow, documentProxy, scopedWindow, scopedWindow);
}

export default function StandaloneHtmlGameHost({
  className = "",
  html,
  scripts = EMPTY_LIST,
  styles = EMPTY_LIST,
}) {
  const hostRef = useRef(null);
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
    const hostElement = hostRef.current;
    if (!hostElement) {
      return undefined;
    }

    const shadowRoot = hostElement.shadowRoot ?? hostElement.attachShadow({ mode: "open" });
    const cleanup = {
      documentListeners: [],
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

    const documentProxy = createScopedDocument({
      hostElement,
      bodyElement,
      shadowRoot,
      cleanup,
    });
    const scopedWindow = createScopedWindow({ cleanup, documentProxy });

    try {
      for (const source of [...parsed.inlineScripts, ...scripts]) {
        runStandaloneScript(source, scopedWindow, documentProxy);
      }
      setIsReady(true);
    } catch (error) {
      console.error("Failed to boot standalone embedded game", error);
      setIsReady(false);
    }

    return () => {
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
