import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useConsent } from "./ConsentContext";

// Browser-router page-view tracking. The initial gtag('config') already emits
// a page_view for the landing URL, so we skip the first render and only emit
// on subsequent route changes — and only when the user has granted analytics
// consent.
export default function RouteAnalyticsTracker() {
  const location = useLocation();
  const { analytics } = useConsent();
  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    if (!analytics) return;
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;

    window.gtag("event", "page_view", {
      page_path: `${location.pathname}${location.search}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location, analytics]);

  return null;
}
