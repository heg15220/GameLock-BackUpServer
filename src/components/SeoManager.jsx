import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import gameLockLogo from "../assets/brand/gamelock-logo.png";
import { buildAbsoluteUrl, normalizeLocale, SITE_NAME } from "../seo/seoConfig";
import { buildStructuredDataGraph, getCategorySeo, getGameSeo, getHomeSeo } from "../seo/seoContent";
import { buildAlternatePaths } from "../seo/seoRoutes";

const JSON_LD_ID = "gamelock-seo-jsonld";

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function upsertAlternateLinks(paths) {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((element) => {
    element.remove();
  });

  Object.entries(paths).forEach(([hreflang, path]) => {
    const element = document.createElement("link");
    element.setAttribute("rel", "alternate");
    element.setAttribute("hreflang", hreflang);
    element.setAttribute("href", buildAbsoluteUrl(path));
    document.head.appendChild(element);
  });
}

function upsertStructuredData(items) {
  let script = document.getElementById(JSON_LD_ID);
  if (!script) {
    script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(buildStructuredDataGraph(items));
}

function SeoManager({ games, activeGame, activeCategory, locale }) {
  const location = useLocation();
  const normalizedLocale = normalizeLocale(locale);
  const seo = useMemo(
    () => {
      if (activeGame) return getGameSeo(activeGame, normalizedLocale);
      if (activeCategory) return getCategorySeo(games, activeCategory, normalizedLocale);
      return getHomeSeo(games, normalizedLocale);
    },
    [activeCategory, activeGame, games, normalizedLocale]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const canonicalUrl = buildAbsoluteUrl(seo.canonicalPath);
    const fallbackImageUrl = buildAbsoluteUrl(gameLockLogo);
    const imageUrl = seo.imageUrl || fallbackImageUrl;
    const ogLocale = normalizedLocale === "en" ? "en_US" : "es_ES";

    document.documentElement.lang = normalizedLocale;
    document.title = seo.title;

    upsertMeta('meta[name="description"]', { name: "description", content: seo.description });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: "index, follow, max-image-preview:large",
    });
    upsertMeta('meta[name="application-name"]', { name: "application-name", content: SITE_NAME });

    upsertLink("canonical", canonicalUrl);
    upsertAlternateLinks(buildAlternatePaths(seo.canonicalPath));

    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: seo.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: seo.description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: seo.type });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: ogLocale });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: seo.title });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: seo.description,
    });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });

    upsertStructuredData(seo.structuredData);
  }, [location.pathname, normalizedLocale, seo]);

  return null;
}

export default SeoManager;
