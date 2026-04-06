import { useEffect, useState } from "react";
import { getViewportProfile } from "../utils/mobileShellProfile";

export default function useMobileGameViewport() {
  const [viewport, setViewport] = useState(getViewportProfile);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncViewport = () => setViewport(getViewportProfile());
    syncViewport();

    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
    };
  }, []);

  return viewport;
}
