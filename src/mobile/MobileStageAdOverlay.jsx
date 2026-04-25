import React, { useLayoutEffect, useMemo, useState } from "react";
import AdPreviewCard from "../components/AdPreviewCard";
import { MOBILE_STAGE_AD_SLOTS } from "../config/adPreview";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectToPlainObject(rect) {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function canObserveNode(observerRootNode, targetNode) {
  return Boolean(
    observerRootNode &&
    targetNode &&
    observerRootNode.ownerDocument === targetNode.ownerDocument
  );
}

function getGlobalRect(node) {
  if (!node || typeof node.getBoundingClientRect !== "function") {
    return null;
  }

  const rect = rectToPlainObject(node.getBoundingClientRect());
  const ownerWindow = node.ownerDocument?.defaultView;
  const frameElement = ownerWindow?.frameElement;

  if (!frameElement || typeof frameElement.getBoundingClientRect !== "function") {
    return rect;
  }

  const frameRect = getGlobalRect(frameElement);
  if (!frameRect) {
    return rect;
  }

  return {
    left: frameRect.left + rect.left,
    top: frameRect.top + rect.top,
    right: frameRect.left + rect.right,
    bottom: frameRect.top + rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function isMeasurableTarget(node) {
  if (!node || typeof node.getBoundingClientRect !== "function") {
    return false;
  }

  const ownerWindow = node.ownerDocument?.defaultView ?? window;
  const computedStyle = ownerWindow.getComputedStyle?.(node);
  if (
    computedStyle &&
    (
      computedStyle.display === "none" ||
      computedStyle.visibility === "hidden" ||
      computedStyle.contentVisibility === "hidden"
    )
  ) {
    return false;
  }

  const rect = node.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function getStageThresholds(formFactor) {
  if (formFactor === "tablet") {
    return {
      padding: 12,
      gap: 10,
      minWidth: 74,
      maxWidth: 128,
      landscapeSideMaxWidth: 196,
      verticalRatio: 1.18,
      horizontalRatio: 1.52,
      preferredBottomMinHeight: 42,
      maxSlots: 1,
    };
  }

  return {
    padding: 8,
    gap: 8,
    minWidth: 52,
    maxWidth: 88,
    landscapeSideMaxWidth: 104,
    verticalRatio: 1.12,
    horizontalRatio: 1.4,
    preferredBottomMinHeight: 34,
    maxSlots: 1,
  };
}

function buildVerticalStripPlacements(strip, thresholds) {
  const innerWidth = strip.width - thresholds.padding * 2;
  const innerHeight = strip.height - thresholds.padding * 2;
  if (innerWidth < thresholds.minWidth || innerHeight < thresholds.minWidth) {
    return [];
  }

  const slotWidth = clamp(innerWidth, thresholds.minWidth, thresholds.maxWidth);
  const slotHeight = Math.min(
    innerHeight,
    Math.max(thresholds.minWidth, slotWidth * thresholds.verticalRatio)
  );
  const stackedHeight = slotHeight * 2 + thresholds.gap;
  const count = stackedHeight <= innerHeight ? 2 : 1;
  const totalHeight = count * slotHeight + (count - 1) * thresholds.gap;
  const startY = strip.y + Math.max(thresholds.padding, (strip.height - totalHeight) / 2);
  const anchoredLeft = strip.kind === "left";
  const x = anchoredLeft
    ? strip.x + strip.width - slotWidth - thresholds.padding
    : strip.x + thresholds.padding;

  return Array.from({ length: count }, (_, index) => ({
    id: `${strip.kind}-${index}`,
    x,
    y: startY + index * (slotHeight + thresholds.gap),
    width: slotWidth,
    height: slotHeight,
  }));
}

function buildHorizontalStripPlacements(strip, thresholds) {
  const innerWidth = strip.width - thresholds.padding * 2;
  const innerHeight = strip.height - thresholds.padding * 2;
  if (innerWidth < thresholds.minWidth * 1.25 || innerHeight < thresholds.minWidth * 0.6) {
    return [];
  }

  const slotHeight = clamp(
    innerHeight,
    Math.max(44, thresholds.minWidth * 0.72),
    thresholds.maxWidth * 0.82
  );
  const slotWidth = clamp(
    slotHeight * thresholds.horizontalRatio,
    thresholds.minWidth * 1.15,
    thresholds.maxWidth * 1.54
  );
  const rowWidth = slotWidth * 2 + thresholds.gap;
  const count = rowWidth <= innerWidth ? 2 : 1;
  const totalWidth = count * slotWidth + (count - 1) * thresholds.gap;
  const startX = strip.x + Math.max(thresholds.padding, (strip.width - totalWidth) / 2);
  const y = strip.kind === "top"
    ? strip.y + strip.height - slotHeight - thresholds.padding
    : strip.y + thresholds.padding;

  return Array.from({ length: count }, (_, index) => ({
    id: `${strip.kind}-${index}`,
    x: startX + index * (slotWidth + thresholds.gap),
    y,
    width: slotWidth,
    height: slotHeight,
  }));
}

function buildHorizontalBannerPlacement(strip, thresholds) {
  const innerWidth = strip.width - thresholds.padding * 2;
  const innerHeight = strip.height - thresholds.padding * 2;
  if (
    innerWidth < thresholds.minWidth * 1.5 ||
    innerHeight < thresholds.preferredBottomMinHeight
  ) {
    return [];
  }

  const slotHeight = clamp(
    innerHeight,
    thresholds.preferredBottomMinHeight,
    thresholds.maxWidth * 0.94
  );

  return [{
    id: `${strip.kind}-primary`,
    x: strip.x + thresholds.padding,
    y: strip.kind === "top"
      ? strip.y + strip.height - slotHeight - thresholds.padding
      : strip.y + thresholds.padding,
    width: innerWidth,
    height: slotHeight,
  }];
}

function buildPreferredBottomPlacement(strip, thresholds) {
  const innerWidth = strip.width - thresholds.padding * 2;
  const innerHeight = strip.height - thresholds.padding * 2;
  if (
    innerWidth < thresholds.minWidth * 1.25 ||
    innerHeight < thresholds.preferredBottomMinHeight
  ) {
    return [];
  }

  const slotHeight = clamp(
    innerHeight,
    thresholds.preferredBottomMinHeight,
    thresholds.maxWidth * 0.9
  );

  return [{
    id: "bottom-primary",
    x: strip.x + thresholds.padding,
    y: strip.y + Math.max(thresholds.padding, strip.height - slotHeight - thresholds.padding),
    width: innerWidth,
    height: slotHeight,
  }];
}

function buildLandscapeSidePlacements(strips, thresholds) {
  const placements = [];

  ["left", "right"].forEach((kind) => {
    const strip = strips.find((entry) => entry.kind === kind);
    if (!strip) {
      return;
    }

    const innerWidth = strip.width - thresholds.padding * 2;
    const innerHeight = strip.height - thresholds.padding * 2;
    if (innerWidth < thresholds.minWidth || innerHeight < thresholds.minWidth * 1.5) {
      return;
    }

    const slotWidth = clamp(
      innerWidth,
      thresholds.minWidth,
      thresholds.landscapeSideMaxWidth ?? thresholds.maxWidth
    );
    const slotHeight = innerHeight;
    const x = kind === "left"
      ? strip.x + strip.width - slotWidth - thresholds.padding
      : strip.x + thresholds.padding;

    placements.push({
      id: `${kind}-landscape-primary`,
      x,
      y: strip.y + thresholds.padding,
      width: slotWidth,
      height: slotHeight,
    });
  });

  return placements;
}

function buildCompactLandscapeSidePlacements(strips, thresholds) {
  const placements = [];

  ["left", "right"].forEach((kind) => {
    const strip = strips.find((entry) => entry.kind === kind);
    if (!strip) {
      return;
    }

    const innerWidth = strip.width - thresholds.padding * 2;
    const innerHeight = strip.height - thresholds.padding * 2;
    if (innerWidth < thresholds.minWidth || innerHeight < thresholds.minWidth * 1.2) {
      return;
    }

    const slotWidth = clamp(
      innerWidth,
      thresholds.minWidth,
      Math.min(thresholds.maxWidth, 86)
    );
    const slotHeight = clamp(
      innerHeight * 0.58,
      thresholds.minWidth * 1.55,
      Math.min(innerHeight, 188)
    );
    const x = kind === "left"
      ? strip.x + strip.width - slotWidth - thresholds.padding
      : strip.x + thresholds.padding;
    const y = strip.y + thresholds.padding;

    placements.push({
      id: `${kind}-compact-primary`,
      x,
      y,
      width: slotWidth,
      height: slotHeight,
    });
  });

  return placements;
}

function computePlacements(
  viewportRect,
  targetRect,
  formFactor,
  gameId,
  preferLandscapeSidePlacements = false
) {
  if (!viewportRect || !targetRect) {
    return [];
  }

  const thresholds = getStageThresholds(formFactor);
  const isLandscape = viewportRect.width > viewportRect.height;
  const left = targetRect.left - viewportRect.left;
  const right = viewportRect.right - targetRect.right;
  const top = targetRect.top - viewportRect.top;
  const bottom = viewportRect.bottom - targetRect.bottom;

  const strips = [
    { kind: "left", x: 0, y: 0, width: left, height: viewportRect.height },
    { kind: "right", x: targetRect.right - viewportRect.left, y: 0, width: right, height: viewportRect.height },
    { kind: "top", x: 0, y: 0, width: viewportRect.width, height: top },
    { kind: "bottom", x: 0, y: targetRect.bottom - viewportRect.top, width: viewportRect.width, height: bottom },
  ];

  if ((preferLandscapeSidePlacements || gameId === "arcade-neon-rush") && isLandscape) {
    const sidePlacements = buildLandscapeSidePlacements(strips, thresholds);
    if (sidePlacements.length > 0) {
      return sidePlacements.slice(0, 2);
    }
  }

  const preferredBottomPlacements = buildPreferredBottomPlacement(strips[3], thresholds);
  if (preferredBottomPlacements.length > 0) {
    return preferredBottomPlacements;
  }

  const placements = [
    ...buildHorizontalBannerPlacement(strips[3], thresholds),
    ...buildHorizontalBannerPlacement(strips[2], thresholds),
    ...buildHorizontalStripPlacements(strips[3], thresholds),
    ...buildHorizontalStripPlacements(strips[2], thresholds),
    ...buildVerticalStripPlacements(strips[0], thresholds),
    ...buildVerticalStripPlacements(strips[1], thresholds),
  ].sort((leftPlacement, rightPlacement) => (
    rightPlacement.width * rightPlacement.height - leftPlacement.width * leftPlacement.height
  ));

  return placements.slice(0, thresholds.maxSlots);
}

function queryIframeTarget(viewportNode, selector) {
  const iframeNodes = viewportNode?.querySelectorAll?.("iframe") ?? [];
  for (const iframeNode of iframeNodes) {
    try {
      const innerTarget = iframeNode.contentDocument?.querySelector(selector);
      if (isMeasurableTarget(innerTarget)) {
        return innerTarget;
      }
    } catch {
      // Ignore cross-document access failures and keep fallback behavior.
    }
  }

  return null;
}

function queryShadowTarget(viewportNode, selector) {
  const nodes = viewportNode?.querySelectorAll?.("*") ?? [];
  for (const node of nodes) {
    const innerTarget = node.shadowRoot?.querySelector?.(selector);
    if (isMeasurableTarget(innerTarget)) {
      return innerTarget;
    }
  }

  return null;
}

function resolveStageTarget(viewportNode, stageSelectors = []) {
  for (const selector of stageSelectors) {
    if (typeof selector !== "string" || selector.length === 0) {
      continue;
    }

    if (selector.startsWith("iframe:")) {
      const iframeTarget = queryIframeTarget(viewportNode, selector.slice(7));
      if (iframeTarget) {
        return iframeTarget;
      }
      continue;
    }

    if (selector.startsWith("shadow:")) {
      const shadowTarget = queryShadowTarget(viewportNode, selector.slice(7));
      if (shadowTarget) {
        return shadowTarget;
      }
      continue;
    }

    const target = viewportNode?.querySelector?.(selector);
    if (isMeasurableTarget(target)) {
      return target;
    }
  }

  return (
    viewportNode?.querySelector?.('[data-mobile-stage-target="true"]') ??
    viewportNode?.firstElementChild ??
    null
  );
}

export default function MobileStageAdOverlay({
  viewportNode,
  enabled,
  locale,
  formFactor,
  gameId,
  stageSelectors,
  preferLandscapeSidePlacements = false,
}) {
  const [placements, setPlacements] = useState([]);
  const slotPool = useMemo(() => MOBILE_STAGE_AD_SLOTS, []);

  useLayoutEffect(() => {
    if (!enabled) {
      setPlacements([]);
      return undefined;
    }

    if (!viewportNode) {
      return undefined;
    }

    let frameId = 0;
    let retryTimeoutIds = [];
    let targetNode = resolveStageTarget(viewportNode, stageSelectors);
    let targetWindow = null;
    let observedInnerDocument = null;
    let innerMutationObserver = null;
    let innerResizeObserver = null;

    const disconnectInnerObservers = () => {
      innerMutationObserver?.disconnect?.();
      innerResizeObserver?.disconnect?.();
      innerMutationObserver = null;
      innerResizeObserver = null;
      observedInnerDocument = null;
    };

    const syncTargetObservers = (nextTarget) => {
      const nextWindow = nextTarget?.ownerDocument?.defaultView ?? null;
      const nextDocument = nextTarget?.ownerDocument ?? null;

      if (targetWindow && targetWindow !== window && targetWindow !== nextWindow) {
        targetWindow.removeEventListener("resize", queueMeasure);
      }

      if (canObserveNode(viewportNode, targetNode)) {
        resizeObserver.unobserve(targetNode);
      }

      targetNode = nextTarget;
      targetWindow = nextWindow;

      if (canObserveNode(viewportNode, targetNode)) {
        resizeObserver.observe(targetNode);
      }

      if (targetWindow && targetWindow !== window) {
        targetWindow.addEventListener("resize", queueMeasure);
      }

      if (nextDocument !== observedInnerDocument) {
        disconnectInnerObservers();

        if (nextDocument && nextDocument !== viewportNode.ownerDocument && targetWindow) {
          const innerRoot = nextDocument.documentElement;
          const innerBody = nextDocument.body;
          innerMutationObserver = new targetWindow.MutationObserver(() => {
            queueMeasure();
          });
          innerMutationObserver.observe(innerRoot, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style", "class", "hidden"],
          });

          if (typeof targetWindow.ResizeObserver === "function") {
            innerResizeObserver = new targetWindow.ResizeObserver(() => {
              queueMeasure();
            });
            [innerRoot, innerBody, targetNode]
              .filter(Boolean)
              .forEach((node) => innerResizeObserver.observe(node));
          }

          observedInnerDocument = nextDocument;
        }
      }
    };

    const measure = () => {
      frameId = 0;
      const nextTarget = resolveStageTarget(viewportNode, stageSelectors);
      if (nextTarget !== targetNode) {
        syncTargetObservers(nextTarget);
      } else {
        targetWindow = targetNode?.ownerDocument?.defaultView ?? null;
      }
      if (!targetNode) {
        setPlacements([]);
        return;
      }

      const viewportRect = rectToPlainObject(viewportNode.getBoundingClientRect());
      const targetRect = getGlobalRect(targetNode);
      const nextPlacements = computePlacements(
        viewportRect,
        targetRect,
        formFactor,
        gameId,
        preferLandscapeSidePlacements
      );
      setPlacements(nextPlacements);
    };

    const queueMeasure = () => {
      if (frameId) {
        return;
      }
      frameId = window.requestAnimationFrame(measure);
    };

    measure();
    retryTimeoutIds = [90, 220, 420, 720].map((delayMs) => (
      window.setTimeout(measure, delayMs)
    ));

    const resizeObserver = new ResizeObserver(() => {
      queueMeasure();
    });
    resizeObserver.observe(viewportNode);
    syncTargetObservers(targetNode);

    const mutationObserver = new MutationObserver(() => {
      const nextTarget = resolveStageTarget(viewportNode, stageSelectors);
      if (nextTarget && nextTarget !== targetNode) {
        syncTargetObservers(nextTarget);
      }
      queueMeasure();
    });
    mutationObserver.observe(viewportNode, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-mobile-stage-target", "style", "class"],
    });

    window.addEventListener("resize", queueMeasure);
    window.addEventListener("orientationchange", queueMeasure);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      retryTimeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      disconnectInnerObservers();
      if (targetWindow && targetWindow !== window) {
        targetWindow.removeEventListener("resize", queueMeasure);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", queueMeasure);
      window.removeEventListener("orientationchange", queueMeasure);
    };
  }, [
    enabled,
    viewportNode,
    formFactor,
    gameId,
    stageSelectors,
    preferLandscapeSidePlacements,
  ]);

  if (!enabled || placements.length === 0) {
    return null;
  }

  return (
    <div
      className="mobile-stage-ad-overlay"
      aria-hidden="true"
      data-mobile-stage-overlay="true"
    >
      {placements.map((placement, index) => (
        <AdPreviewCard
          key={placement.id}
          slot={slotPool[index % slotPool.length]}
          locale={locale}
          className={[
            "mobile-stage-ad-overlay__card",
            placement.width <= 88 && placement.height <= 220
              ? "mobile-stage-ad-overlay__card--compact-side"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            left: `${placement.x}px`,
            top: `${placement.y}px`,
            width: `${placement.width}px`,
            height: `${placement.height}px`,
          }}
        />
      ))}
    </div>
  );
}
