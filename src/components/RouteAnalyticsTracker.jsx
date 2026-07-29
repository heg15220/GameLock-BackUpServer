import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useConsent } from "./ConsentContext";

// Browser-router page-view tracking. Both GA and GoatCounter already emit a
// hit for the landing URL on load, so we skip the first render and only emit
// on subsequent route changes.
//
// GA is gated behind analytics consent; GoatCounter is not, because it sets no
// cookies and stores no personal data, so it falls outside the consent banner.
export default function RouteAnalyticsTracker() {
  const location = useLocation();
  const { analytics } = useConsent();
  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    if (typeof window === "undefined") return;

    if (analytics && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: `${location.pathname}${location.search}`,
        page_location: window.location.href,
        page_title: document.title,
      });
    }

    if (typeof window.goatcounter?.count === "function") {
      window.goatcounter.count({
        path: `${location.pathname}${location.search}`,
        title: document.title,
        event: false,
      });
    }
  }, [location, analytics]);

  return null;
}
