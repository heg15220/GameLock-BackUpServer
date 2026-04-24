import { useEffect, useRef, useState } from "react";

function resolveEmbeddedMobileShellBodyClassName(
  shellNode,
  includeUiExternalized = false
) {
  if (!shellNode?.classList?.contains("mobile-game-shell")) {
    return "";
  }

  const classNames = ["mobile-shell-embed"];
  if (includeUiExternalized) {
    classNames.push("mobile-shell-ui-externalized");
  }
  if (shellNode.classList.contains("mobile-game-shell--portrait")) {
    classNames.push("mobile-shell-portrait");
  }
  if (shellNode.classList.contains("mobile-game-shell--landscape")) {
    classNames.push("mobile-shell-landscape");
  }
  return classNames.join(" ");
}

export default function useEmbeddedMobileShellBodyClassName(
  includeUiExternalized = false
) {
  const shellRef = useRef(null);
  const [bodyClassName, setBodyClassName] = useState("");

  useEffect(() => {
    const shellElement = shellRef.current;
    if (!shellElement) {
      return undefined;
    }

    const mobileShellElement = shellElement.closest(".mobile-game-shell");
    const syncBodyClassName = () => {
      setBodyClassName(
        resolveEmbeddedMobileShellBodyClassName(
          mobileShellElement,
          includeUiExternalized
        )
      );
    };

    syncBodyClassName();
    if (!mobileShellElement) {
      return undefined;
    }

    const observer = new MutationObserver(() => {
      syncBodyClassName();
    });
    observer.observe(mobileShellElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, [includeUiExternalized]);

  return {
    bodyClassName,
    shellRef,
  };
}
